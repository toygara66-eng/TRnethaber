import { countPendingQueueJobs } from "@/lib/bot/news-bot-queue";
import {
  runNewsBotDirectArticle,
  runNewsBotProcessPhase,
  type NewsBotFetchPhaseResult,
  type NewsBotProcessPhaseResult,
} from "@/lib/bot/pipeline";
import { createPipelineClock } from "@/lib/bot/pipeline-timeout";

export type NewsBotOrchestratorResult = {
  fetch: NewsBotFetchPhaseResult;
  process: NewsBotProcessPhaseResult;
};

const SKIPPED_FETCH: NewsBotFetchPhaseResult = {
  ok: true,
  deferred: false,
  fetched: 0,
  pending: 0,
  elapsedMs: 0,
};

/**
 * Tek cron isteğinde en fazla 1 haber — kuyruk varsa process, yoksa doğrudan üretim.
 * Fetch+process çift RSS çekimini önler (timeout koruması).
 */
export async function runNewsBotOrchestratorInline(): Promise<NewsBotOrchestratorResult> {
  const clock = createPipelineClock(52_000);

  let pending = 0;
  try {
    pending = await countPendingQueueJobs();
  } catch (err) {
    console.warn("[news-bot] Kuyruk sayımı başarısız, doğrudan mod:", err);
  }

  if (pending > 0) {
    console.info(`[news-bot] Kuyrukta ${pending} pending — yalnızca process fazı`);
    const process = await runNewsBotProcessPhase(clock);
    return {
      fetch: { ...SKIPPED_FETCH, pending },
      process,
    };
  }

  console.info("[news-bot] Kuyruk boş — doğrudan tek haber üretimi");
  const process = await runNewsBotDirectArticle(clock);
  return { fetch: SKIPPED_FETCH, process };
}
