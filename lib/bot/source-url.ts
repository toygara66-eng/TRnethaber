/**
 * RSS / ajans kaynak URL — duplicate kalkan için agresif kanonik form.
 * 1) ? sonrası TÜM query parametreleri kesilir (UTM, fbclid vb.)
 * 2) http/https, www/m. host önekleri normalize edilir
 */
const HOST_PREFIX_RE = /^(www|m|mobile|amp|wap|touch)\./i;

/** Kesin query temizliği — veritabanı aramasından önce her zaman uygula */
export function stripUrlQueryAndHash(raw: string): string {
  const trimmed = raw.trim();
  const noHash = trimmed.split("#")[0] ?? trimmed;
  return noHash.split("?")[0] ?? noHash;
}

function stripHostPrefixes(hostname: string): string {
  let host = hostname.toLowerCase();
  for (let i = 0; i < 6; i++) {
    const next = host.replace(HOST_PREFIX_RE, "");
    if (next === host) break;
    host = next;
  }
  return host;
}

function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function canonicalPath(pathname: string): string {
  let path = decodePath(pathname || "/");
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return path || "/";
}

function canonicalizeParsedUrl(parsed: URL): string {
  const host = stripHostPrefixes(parsed.hostname);
  const path = canonicalPath(parsed.pathname);
  return `https://${host}${path}`;
}

function canonicalizeFallback(raw: string): string {
  return stripUrlQueryAndHash(raw).trim().toLowerCase();
}

export function cleanRssSourceUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const withoutQuery = stripUrlQueryAndHash(trimmed);
  if (!withoutQuery) return "";

  try {
    const parsed = new URL(withoutQuery);
    parsed.hash = "";
    parsed.search = "";
    return canonicalizeParsedUrl(parsed);
  } catch {
    return canonicalizeFallback(trimmed);
  }
}

/** Eski kayıtlarla karşılaştırma — DB'deki UTM'li URL'leri de normalize eder */
export function urlsMatchForDuplicate(a: string, b: string): boolean {
  const ca = cleanRssSourceUrl(a);
  const cb = cleanRssSourceUrl(b);
  return Boolean(ca && cb && ca === cb);
}
