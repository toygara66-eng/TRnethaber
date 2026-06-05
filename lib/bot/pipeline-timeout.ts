/** Vercel 60 sn sınırından önce güvenli durma eşiği */
export const PIPELINE_NEAR_TIMEOUT_MS = 40_000;

export type PipelineClock = {
  startedAt: number;
  budgetMs: number;
  elapsedMs: () => number;
  isNearTimeout: () => boolean;
};

export function createPipelineClock(
  budgetMs = PIPELINE_NEAR_TIMEOUT_MS,
): PipelineClock {
  const startedAt = Date.now();
  return {
    startedAt,
    budgetMs,
    elapsedMs: () => Date.now() - startedAt,
    isNearTimeout: () => Date.now() - startedAt >= budgetMs,
  };
}

/** @deprecated createPipelineClock().isNearTimeout() kullanın */
export function isNearTimeout(
  startedAt: number,
  budgetMs = PIPELINE_NEAR_TIMEOUT_MS,
): boolean {
  return Date.now() - startedAt >= budgetMs;
}
