/** Vercel Hobby cron üst süre sınırı (saniye) */
export const VERCEL_CRON_MAX_DURATION_SEC = 60;

/** Fonksiyon bütçesi — Vercel 60 sn sınırından pay bırakır */
export const CRON_AI_BUDGET_MS = 55_000;

export {
  createPipelineClock,
  isNearTimeout,
  PIPELINE_NEAR_TIMEOUT_MS,
} from "@/lib/bot/pipeline-timeout";

export const AI_TIMEOUT_DEFER_LOG =
  "Yapay zeka yanıt süresi aşıldı, işlem bir sonraki Cron tetiklemesine bırakıldı";

export function isAiTimeoutOrStallError(err: unknown): boolean {
  const msg = (
    err instanceof Error ? err.message : String(err ?? "")
  ).toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("zaman aşımı") ||
    msg.includes("timed out") ||
    msg.includes("abort") ||
    msg.includes("504") ||
    msg.includes("gateway") ||
    msg === "ai_timeout"
  );
}

export function logAiTimeoutDefer(label: string): void {
  console.warn(`[${label}] ${AI_TIMEOUT_DEFER_LOG}`);
}

export type CronAiBudgetResult<T> =
  | { status: "ok"; value: T }
  | { status: "timeout" };

/**
 * Cron gövdesini süre bütçesi içinde çalıştırır.
 * Aşımda throw etmez — timeout durumu döner.
 */
export async function runWithCronAiBudget<T>(
  fn: () => Promise<T>,
  budgetMs = CRON_AI_BUDGET_MS,
): Promise<CronAiBudgetResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("AI_TIMEOUT")), budgetMs);
    });
    const value = await Promise.race([fn(), timeoutPromise]);
    return { status: "ok", value };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === "AI_TIMEOUT" || isAiTimeoutOrStallError(err))
    ) {
      return { status: "timeout" };
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
