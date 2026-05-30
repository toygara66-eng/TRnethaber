/**
 * RSS / ajans kaynak URL — duplicate kalkan için kanonik form.
 * Takip parametreleri (?utm_*, fbclid vb.) atılır.
 */
export function cleanRssSourceUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const withoutHash = trimmed.split("#")[0] ?? trimmed;
    const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
    const parsed = new URL(withoutQuery);
    let path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}`;
  } catch {
    const fallback = (trimmed.split("#")[0] ?? trimmed).split("?")[0] ?? trimmed;
    return fallback.trim().toLowerCase();
  }
}
