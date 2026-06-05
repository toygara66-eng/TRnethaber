import {
  ArticleDuplicateCache,
  DUPLICATE_TITLE_SKIP_MESSAGE,
  DUPLICATE_URL_SKIP_MESSAGE,
  DuplicateArticleError,
} from "@/lib/bot/duplicate-check";
import { runEntityBotForArticle } from "@/lib/bot/entity-bot";
import { pickNextMockWire } from "@/lib/bot/mock-wire";
import { persistSynthesizedArticle } from "@/lib/bot/persist";
import { fetchRandomRssWire } from "@/lib/bot/rss-fetcher";
import type { RssPickMeta } from "@/lib/bot/rss-fetcher";
import {
  AI_PROVIDERS_EXHAUSTED_MESSAGE,
  GEMINI_BUSY_USER_MESSAGE,
  isGeminiBusyError,
  logGeminiBusy,
  AiProvidersExhaustedError,
} from "@/lib/bot/gemini-client";
import { synthesizeFromWire } from "@/lib/bot/synthesizer";
import type { AgencyWire, EntityUpsertResult } from "@/lib/bot/types";

/** Eski eşzamanlı üst sınır 10 → kademeli işleme için 3 */
export const NEWS_BOT_CHUNK_SIZE = 3;

/** Bir cron turunda işlenecek maksimum haber (eski 10 → varsayılan 3) */
export const NEWS_BOT_MAX_PER_RUN = Number(process.env.NEWS_BOT_MAX_PER_RUN ?? "3");

/** Vercel 60 sn sınırından önce güvenli durma eşiği */
export const NEWS_BOT_TIME_BUDGET_MS = 45_000;

export type NewsBotPipelineResult =
  | {
      ok: true;
      skipped: false;
      source: "rss" | "mock";
      rss?: RssPickMeta;
      wireId: string;
      article: {
        id: string;
        slug: string;
        title: string;
        spot_metni: string;
        okuma_sayisi: string;
        is_breaking: boolean;
        kapak_gorseli: string;
      };
      entities: EntityUpsertResult[];
    }
  | {
      ok: true;
      skipped: true;
      reason: "duplicate" | "duplicate_url" | "duplicate_title" | "gemini_busy";
      duplicateReason?: string;
      wireId: string;
      rss?: RssPickMeta;
      message: string;
    };

export type NewsBotBatchPipelineResult = {
  ok: boolean;
  deferred: boolean;
  processed: number;
  saved: number;
  elapsedMs: number;
  results: NewsBotPipelineResult[];
};

async function acquireWire(): Promise<{
  wire: AgencyWire;
  source: "rss" | "mock";
  rss?: RssPickMeta;
}> {
  if (process.env.RSS_USE_MOCK === "true") {
    return { wire: pickNextMockWire(), source: "mock" };
  }

  const { wire, meta } = await fetchRandomRssWire();
  return { wire, source: "rss", rss: meta };
}

function isSavedResult(
  result: NewsBotPipelineResult,
): result is Extract<NewsBotPipelineResult, { skipped: false }> {
  return result.ok && !result.skipped;
}

async function processOneNewsArticle(
  duplicateCache: ArticleDuplicateCache,
): Promise<NewsBotPipelineResult> {
  let wire: AgencyWire;
  let source: "rss" | "mock";
  let rss: RssPickMeta | undefined;

  try {
    const acquired = await acquireWire();
    wire = acquired.wire;
    source = acquired.source;
    rss = acquired.rss;
  } catch (err) {
    if (err instanceof DuplicateArticleError) {
      return {
        ok: true,
        skipped: true,
        duplicateReason: err.reason,
        wireId: err.wire?.id ?? "unknown",
        rss: err.rss,
        message:
          err.reason === "url"
            ? DUPLICATE_URL_SKIP_MESSAGE
            : err.reason === "title"
              ? DUPLICATE_TITLE_SKIP_MESSAGE
              : "Haber zaten veritabanında. İşlem iptal edildi.",
        reason:
          err.reason === "url"
            ? "duplicate_url"
            : err.reason === "title"
              ? "duplicate_title"
              : "duplicate",
      };
    }
    throw err;
  }

  let synthesized;
  try {
    synthesized = await synthesizeFromWire(wire);
  } catch (err) {
    if (err instanceof AiProvidersExhaustedError) {
      logGeminiBusy(err);
      return {
        ok: true,
        skipped: true,
        reason: "gemini_busy",
        wireId: wire.id,
        rss,
        message: AI_PROVIDERS_EXHAUSTED_MESSAGE,
      };
    }
    if (isGeminiBusyError(err)) {
      logGeminiBusy(err);
      return {
        ok: true,
        skipped: true,
        reason: "gemini_busy",
        wireId: wire.id,
        rss,
        message: GEMINI_BUSY_USER_MESSAGE,
      };
    }
    throw err;
  }

  let saved: { id: string; slug: string };
  try {
    saved = await persistSynthesizedArticle(synthesized, wire.sourceUrl, duplicateCache);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const dupMatch = /^duplicate_(title|slug|url)$/.exec(message);
    if (dupMatch) {
      const kind = dupMatch[1] as "title" | "slug" | "url";
      return {
        ok: true,
        skipped: true,
        reason:
          kind === "url"
            ? "duplicate_url"
            : kind === "title"
              ? "duplicate_title"
              : "duplicate",
        duplicateReason: kind,
        wireId: wire.id,
        rss,
        message:
          kind === "url"
            ? DUPLICATE_URL_SKIP_MESSAGE
            : kind === "title"
              ? DUPLICATE_TITLE_SKIP_MESSAGE
              : "Haber zaten veritabanında. İşlem iptal edildi.",
      };
    }
    throw err;
  }

  const entities = await runEntityBotForArticle({
    title: synthesized.title,
    spot: synthesized.spot_metni,
    content: synthesized.content,
    articleSlug: saved.slug,
  });

  return {
    ok: true,
    skipped: false,
    source,
    rss,
    wireId: wire.id,
    article: {
      id: saved.id,
      slug: saved.slug,
      title: synthesized.title,
      spot_metni: synthesized.spot_metni,
      okuma_sayisi: synthesized.okuma_sayisi,
      is_breaking: synthesized.is_breaking,
      kapak_gorseli: synthesized.kapak_gorseli,
    },
    entities,
  };
}

function elapsedMsSince(startedAt: number): number {
  return Date.now() - startedAt;
}

/**
 * Karanlık Fabrika — kademeli üretim hattı.
 * Haberler 3'lük dilimler halinde işlenir; her dilim sonunda 45 sn bütçe kontrol edilir.
 */
export async function runNewsBotPipeline(): Promise<NewsBotBatchPipelineResult> {
  const startedAt = Date.now();
  const duplicateCache = new ArticleDuplicateCache();
  await duplicateCache.warm();

  const results: NewsBotPipelineResult[] = [];
  let saved = 0;
  const maxPerRun = Math.max(1, NEWS_BOT_MAX_PER_RUN);
  const chunkSize = Math.max(1, NEWS_BOT_CHUNK_SIZE);

  console.info(
    `[news-bot] Kademeli işleme: dilim=${chunkSize}, üst sınır=${maxPerRun}, bütçe=${NEWS_BOT_TIME_BUDGET_MS}ms`,
  );

  for (let i = 0; i < maxPerRun; i++) {
    const result = await processOneNewsArticle(duplicateCache);
    results.push(result);
    if (isSavedResult(result)) saved += 1;

    const processed = i + 1;
    const chunkBoundary = processed % chunkSize === 0;
    const isLast = processed >= maxPerRun;

    if (chunkBoundary || isLast) {
      const elapsed = elapsedMsSince(startedAt);
      if (elapsed >= NEWS_BOT_TIME_BUDGET_MS) {
        console.warn(
          `[news-bot] Süre bütçesi aşıldı (${elapsed}ms ≥ ${NEWS_BOT_TIME_BUDGET_MS}ms); kalan haberler ertelendi.`,
        );
        return {
          ok: true,
          deferred: true,
          processed,
          saved,
          elapsedMs: elapsed,
          results,
        };
      }

      if (!isLast) {
        console.info(
          `[news-bot] Dilim tamamlandı (${processed}/${maxPerRun}); geçen süre ${elapsed}ms`,
        );
      }
    }
  }

  return {
    ok: true,
    deferred: false,
    processed: results.length,
    saved,
    elapsedMs: elapsedMsSince(startedAt),
    results,
  };
}
