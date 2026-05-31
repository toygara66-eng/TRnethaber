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
import { GEMINI_BUSY_USER_MESSAGE, isGeminiBusyError, logGeminiBusy } from "@/lib/bot/gemini-client";
import { synthesizeFromWire } from "@/lib/bot/synthesizer";
import type { AgencyWire, EntityUpsertResult } from "@/lib/bot/types";

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

/**
 * Karanlık Fabrika — zincirleme üretim hattı
 * 1) RSS avcı  2) Gemini haber  3) articles INSERT
 * 4) Gemini varlıklar  5) entities UPSERT
 */
export async function runNewsBotPipeline(): Promise<NewsBotPipelineResult> {
  let wire: AgencyWire;
  let source: "rss" | "mock";
  let rss: RssPickMeta | undefined;
  const duplicateCache = new ArticleDuplicateCache();
  await duplicateCache.warm();

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

  // Bekleme (Soğuma) Molası Fonksiyonu
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  
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
