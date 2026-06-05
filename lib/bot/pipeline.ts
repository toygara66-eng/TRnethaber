import {
  ArticleDuplicateCache,
  DUPLICATE_TITLE_SKIP_MESSAGE,
  DUPLICATE_URL_SKIP_MESSAGE,
  DuplicateArticleError,
} from "@/lib/bot/duplicate-check";
import { runEntityBotForArticle } from "@/lib/bot/entity-bot";
import { pickNextMockWire } from "@/lib/bot/mock-wire";
import {
  countPendingQueueJobs,
  enqueueWireJob,
  listPendingQueueJobs,
  markQueueJobCompleted,
  markQueueJobPending,
  markQueueJobProcessing,
  markQueueJobSkipped,
  resetStaleProcessingJobs,
  type NewsBotQueueRow,
} from "@/lib/bot/news-bot-queue";
import { persistSynthesizedArticle } from "@/lib/bot/persist";
import {
  createPipelineClock,
  PIPELINE_NEAR_TIMEOUT_MS,
  type PipelineClock,
} from "@/lib/bot/pipeline-timeout";
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

export { PIPELINE_NEAR_TIMEOUT_MS } from "@/lib/bot/pipeline-timeout";

/** Fetch fazında RSS'ten çekilecek maksimum haber */
export const NEWS_BOT_FETCH_BATCH = Number(process.env.NEWS_BOT_FETCH_BATCH ?? "3");

/** Process fazında işlenecek maksimum kuyruk öğesi */
export const NEWS_BOT_PROCESS_BATCH = Number(process.env.NEWS_BOT_PROCESS_BATCH ?? "3");

export type NewsBotPipelineResult =
  | {
      ok: true;
      skipped: false;
      source: "rss" | "mock";
      rss?: RssPickMeta;
      wireId: string;
      queueId?: string;
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
      queueId?: string;
      rss?: RssPickMeta;
      message: string;
    };

export type NewsBotFetchPhaseResult = {
  ok: boolean;
  deferred: boolean;
  fetched: number;
  pending: number;
  elapsedMs: number;
};

export type NewsBotProcessPhaseResult = {
  ok: boolean;
  deferred: boolean;
  processed: number;
  saved: number;
  pending: number;
  elapsedMs: number;
  results: NewsBotPipelineResult[];
};

/** @deprecated Kuyruk mimarisi — fetch + process fazlarını kullanın */
export type NewsBotBatchPipelineResult = NewsBotProcessPhaseResult;

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

async function processWirePayload(
  wire: AgencyWire,
  source: "rss" | "mock",
  rss: RssPickMeta | undefined,
  duplicateCache: ArticleDuplicateCache,
  queueId?: string,
): Promise<NewsBotPipelineResult> {
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
        queueId,
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
        queueId,
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
        queueId,
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
    queueId,
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

function queueRowToContext(row: NewsBotQueueRow): {
  wire: AgencyWire;
  source: "rss" | "mock";
  rss?: RssPickMeta;
} {
  return {
    wire: row.wire_payload,
    source: row.source,
    rss: row.rss_meta ?? undefined,
  };
}

/**
 * Faz 1 — RSS/mock kaynaklardan wire çek, kuyruğa pending olarak yaz.
 */
export async function runNewsBotFetchPhase(
  clock: PipelineClock = createPipelineClock(),
): Promise<NewsBotFetchPhaseResult> {
  let fetched = 0;
  const batch = Math.max(1, NEWS_BOT_FETCH_BATCH);

  console.info(
    `[news-bot:fetch] Başladı — batch=${batch}, bütçe=${clock.budgetMs}ms`,
  );

  for (let i = 0; i < batch; i++) {
    if (clock.isNearTimeout()) {
      const pending = await countPendingQueueJobs();
      console.warn(
        `[news-bot:fetch] Süre bütçesi doldu (${clock.elapsedMs()}ms); ${pending} pending kaldı.`,
      );
      return {
        ok: true,
        deferred: true,
        fetched,
        pending,
        elapsedMs: clock.elapsedMs(),
      };
    }

    try {
      const acquired = await acquireWire();
      await enqueueWireJob(acquired);
      fetched += 1;
    } catch (err) {
      if (err instanceof DuplicateArticleError) {
        console.info("[news-bot:fetch] Duplicate atlandı:", err.reason);
        continue;
      }
      throw err;
    }
  }

  const pending = await countPendingQueueJobs();
  return {
    ok: true,
    deferred: false,
    fetched,
    pending,
    elapsedMs: clock.elapsedMs(),
  };
}

/**
 * Faz 2 — pending kuyruk öğelerini işle; 40 sn dolunca pending bırakıp dur.
 */
export async function runNewsBotProcessPhase(
  clock: PipelineClock = createPipelineClock(),
): Promise<NewsBotProcessPhaseResult> {
  await resetStaleProcessingJobs();

  const duplicateCache = new ArticleDuplicateCache();
  await duplicateCache.warm();

  const results: NewsBotPipelineResult[] = [];
  let saved = 0;
  let processed = 0;
  const batch = Math.max(1, NEWS_BOT_PROCESS_BATCH);

  console.info(
    `[news-bot:process] Başladı — batch=${batch}, bütçe=${clock.budgetMs}ms`,
  );

  const pendingRows = await listPendingQueueJobs(batch);

  for (const row of pendingRows) {
    if (clock.isNearTimeout()) {
      const pending = await countPendingQueueJobs();
      console.warn(
        `[news-bot:process] Süre bütçesi doldu (${clock.elapsedMs()}ms); ${pending} pending, ${saved} kaydedildi.`,
      );
      return {
        ok: true,
        deferred: true,
        processed,
        saved,
        pending,
        elapsedMs: clock.elapsedMs(),
        results,
      };
    }

    await markQueueJobProcessing(row.id);
    const { wire, source, rss } = queueRowToContext(row);

    try {
      const result = await processWirePayload(
        wire,
        source,
        rss,
        duplicateCache,
        row.id,
      );
      results.push(result);
      processed += 1;

      if (isSavedResult(result)) {
        saved += 1;
        await markQueueJobCompleted(row.id, {
          articleId: result.article.id,
          slug: result.article.slug,
        });
      } else {
        await markQueueJobSkipped(row.id, result.message, {
          reason: result.reason,
          wireId: result.wireId,
        });
      }
    } catch (err) {
      await markQueueJobPending(row.id);
      throw err;
    }
  }

  const pending = await countPendingQueueJobs();
  return {
    ok: true,
    deferred: false,
    processed,
    saved,
    pending,
    elapsedMs: clock.elapsedMs(),
    results,
  };
}

/** Geriye dönük uyumluluk — fetch ardından process */
export async function runNewsBotPipeline(): Promise<NewsBotProcessPhaseResult> {
  await runNewsBotFetchPhase();
  return runNewsBotProcessPhase();
}
