import {
  runNewsBotFetchPhase,
  runNewsBotProcessPhase,
  type NewsBotFetchPhaseResult,
  type NewsBotProcessPhaseResult,
} from "@/lib/bot/pipeline";

export type NewsBotOrchestratorResult = {
  fetch: NewsBotFetchPhaseResult;
  process: NewsBotProcessPhaseResult;
};

/**
 * Fetch + process — tek lambda içinde sırayla (güvenilir haber üretimi).
 * Deprem kontrolü ayrı /api/cron/earthquake-bot cron'unda çalışır.
 */
export async function runNewsBotOrchestratorInline(): Promise<NewsBotOrchestratorResult> {
  const fetch = await runNewsBotFetchPhase();
  console.info("[news-bot] Fetch fazı:", fetch);

  const process = await runNewsBotProcessPhase();
  console.info("[news-bot] Process fazı:", process);

  return { fetch, process };
}
