/**
 * RSS / ajans kaynak URL — duplicate kalkan için agresif kanonik form.
 * - http/https tek protokole indirgenir
 * - www, m., mobile., amp. vb. host önekleri kaldırılır
 * - TÜM sorgu parametreleri ve hash atılır
 */
const HOST_PREFIX_RE = /^(www|m|mobile|amp|wap|touch)\./i;

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
  const noHash = raw.split("#")[0] ?? raw;
  const noQuery = noHash.split("?")[0] ?? noHash;
  return noQuery.trim().toLowerCase();
}

export function cleanRssSourceUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const withoutHash = trimmed.split("#")[0] ?? trimmed;
    const parsed = new URL(withoutHash);
    parsed.hash = "";
    parsed.search = "";
    return canonicalizeParsedUrl(parsed);
  } catch {
    return canonicalizeFallback(trimmed);
  }
}

/** Eski kayıtlarla karşılaştırma — mümkünse aynı kanonik forma çeker */
export function urlsMatchForDuplicate(a: string, b: string): boolean {
  const ca = cleanRssSourceUrl(a);
  const cb = cleanRssSourceUrl(b);
  return Boolean(ca && cb && ca === cb);
}
