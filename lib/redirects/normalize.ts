/** Yönlendirme eşleştirmesi için URL yolu normalleştirme */
export function normalizePath(path: string): string {
  if (!path || path === "") return "/";

  let normalized = path.trim();

  try {
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      const parsed = new URL(normalized);
      normalized = `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* göreli yol */
  }

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized || "/";
}

export function normalizeTargetUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "/";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return normalizePath(trimmed);
}
