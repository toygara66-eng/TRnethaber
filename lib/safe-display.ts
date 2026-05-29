/** Boş, null veya "null" string gibi geçersiz değerleri filtreler */
export function isBlankValue(value: unknown): boolean {
  if (value == null) return true;
  const text = String(value).trim();
  if (!text) return true;
  const lower = text.toLowerCase();
  return lower === "null" || lower === "undefined" || lower === "none";
}

export function safeText(value: unknown, fallback = ""): string {
  if (isBlankValue(value)) return fallback;
  return String(value).trim();
}

export function safeSlug(value: unknown, fallback = "haber"): string {
  const slug = safeText(value, fallback);
  return slug.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}

export function safeIsoDate(value: unknown): string {
  const text = safeText(value);
  if (!text) return new Date().toISOString();
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return new Date().toISOString();
  return new Date(parsed).toISOString();
}
