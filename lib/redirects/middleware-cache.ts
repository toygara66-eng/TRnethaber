import { getActiveRedirectsForMiddleware } from "@/lib/queries/redirects";

type RedirectMap = Map<string, string>;

let cachedMap: RedirectMap | null = null;
let cacheExpiresAt = 0;

const CACHE_TTL_MS = 60_000;

export async function getRedirectTarget(pathname: string): Promise<string | null> {
  const map = await getRedirectMap();
  return map.get(pathname) ?? null;
}

async function getRedirectMap(): Promise<RedirectMap> {
  const now = Date.now();
  if (cachedMap && now < cacheExpiresAt) {
    return cachedMap;
  }

  const rows = await getActiveRedirectsForMiddleware();
  const map: RedirectMap = new Map();

  for (const row of rows) {
    map.set(row.from_url, row.to_url);
  }

  cachedMap = map;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return map;
}

/** Admin yönlendirme kaydı sonrası önbelleği temizle */
export function invalidateRedirectCache(): void {
  cachedMap = null;
  cacheExpiresAt = 0;
}
