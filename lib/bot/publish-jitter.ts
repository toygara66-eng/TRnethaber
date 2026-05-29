/** Kayıt öncesi doğal yayın gecikmesi (saniye) — robotik toplu yükleme hissini kırar */

const DEFAULT_MIN_SEC = 15;
const DEFAULT_MAX_SEC = 90;

function parseBound(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function randomPublishJitterMs(): number {
  const minSec = parseBound(process.env.PUBLISH_JITTER_MIN_SEC, DEFAULT_MIN_SEC);
  const maxSec = parseBound(process.env.PUBLISH_JITTER_MAX_SEC, DEFAULT_MAX_SEC);
  const lo = Math.min(minSec, maxSec);
  const hi = Math.max(minSec, maxSec);
  const sec = lo + Math.floor(Math.random() * (hi - lo + 1));
  return sec * 1000;
}

export async function awaitPublishJitter(): Promise<{ waitedMs: number }> {
  const waitedMs = randomPublishJitterMs();
  await new Promise<void>((resolve) => {
    setTimeout(resolve, waitedMs);
  });
  return { waitedMs };
}
