import {
  GEMINI_BUSY_USER_MESSAGE,
  isGeminiBusyError,
} from "@/lib/bot/gemini-client";
import { publishSavedNewsBotResults } from "@/lib/bot/news-bot-publish";
import { runNewsBotProcessPhase } from "@/lib/bot/pipeline";
import {
  AI_TIMEOUT_DEFER_LOG,
  isAiTimeoutOrStallError,
  logAiTimeoutDefer,
  runWithCronAiBudget,
} from "@/lib/bot/cron-graceful";

export type NewsBotProcessJobResult = {
  ok: boolean;
  phase: "process";
  engine: "queue-v3";
  httpStatus: number;
  saved?: number;
  processed?: number;
  pending?: number;
  deferred?: boolean;
  reason?: string;
  message?: string;
  social?: unknown;
  results?: unknown[];
  error?: string;
};

/**
 * Haber botu process fazı — route ve waitUntil arka planı ortak gövde.
 */
export async function runNewsBotProcessJob(
  budgetMs = 55_000,
): Promise<NewsBotProcessJobResult> {
  try {
    const budget = await runWithCronAiBudget(() => runNewsBotProcessPhase(), budgetMs);

    if (budget.status === "timeout") {
      logAiTimeoutDefer("news-bot-process");
      return {
        ok: true,
        phase: "process",
        engine: "queue-v3",
        httpStatus: 200,
        deferred: true,
        reason: "ai_timeout",
        message: AI_TIMEOUT_DEFER_LOG,
      };
    }

    const result = budget.value;

    if (result.deferred) {
      logAiTimeoutDefer("news-bot-process");
      return {
        ok: true,
        phase: "process",
        engine: "queue-v3",
        httpStatus: 200,
        saved: result.saved,
        processed: result.processed,
        pending: result.pending,
        deferred: true,
        reason: "ai_timeout",
        message: AI_TIMEOUT_DEFER_LOG,
        results: result.results,
      };
    }

    const savedResults = result.results.filter(
      (row): row is Extract<typeof row, { skipped: false }> => row.ok && !row.skipped,
    );

    if (savedResults.length === 0) {
      const last = result.results[result.results.length - 1];
      if (last?.ok && last.skipped && last.reason === "gemini_busy") {
        return {
          ok: true,
          phase: "process",
          engine: "queue-v3",
          httpStatus: 200,
          saved: result.saved,
          processed: result.processed,
          pending: result.pending,
          message: GEMINI_BUSY_USER_MESSAGE,
          results: result.results,
        };
      }
      return {
        ok: true,
        phase: "process",
        engine: "queue-v3",
        httpStatus: 200,
        saved: result.saved,
        processed: result.processed,
        pending: result.pending,
        results: result.results,
      };
    }

    const socialPosts = await publishSavedNewsBotResults(savedResults);

    return {
      ok: true,
      phase: "process",
      engine: "queue-v3",
      httpStatus: 201,
      saved: result.saved,
      processed: result.processed,
      pending: result.pending,
      social: socialPosts,
      results: result.results,
    };
  } catch (err) {
    if (isGeminiBusyError(err)) {
      return {
        ok: true,
        phase: "process",
        engine: "queue-v3",
        httpStatus: 200,
        message: GEMINI_BUSY_USER_MESSAGE,
      };
    }
    if (isAiTimeoutOrStallError(err)) {
      logAiTimeoutDefer("news-bot-process");
      return {
        ok: true,
        phase: "process",
        engine: "queue-v3",
        httpStatus: 200,
        deferred: true,
        reason: "ai_timeout",
        message: AI_TIMEOUT_DEFER_LOG,
      };
    }
    const message = err instanceof Error ? err.message : "Process fazı başarısız";
    console.error("[news-bot-process]", err);
    return {
      ok: false,
      phase: "process",
      engine: "queue-v3",
      httpStatus: 500,
      error: message,
    };
  }
}
