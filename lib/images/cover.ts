/**
 * Kapak görseli URL çözümleme ve yedek (fallback) mantığı.
 */

export const DEFAULT_COVER_IMAGE =
  "https://picsum.photos/seed/trnet-fallback/1920/1080.jpg";

/** Soyut, deterministik Picsum kapak — doğrudan .jpg URL */
export function buildPicsumCoverUrl(seed: string): string {
  const numericSeed = Math.abs(
    (seed || "trnet")
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0),
  );
  return `https://picsum.photos/seed/${numericSeed}/1920/1080.jpg`;
}

export function isAllowedCoverUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (host === "picsum.photos" || host.endsWith(".picsum.photos")) return true;
    if (host === "images.unsplash.com") return true;
    if (/\.(jpe?g|webp)(\?|$)/i.test(path)) return true;

    return false;
  } catch {
    return false;
  }
}

/** Boş veya şüpheli URL'de yedek döner (sunucu tarafı). */
export function resolveCoverImageSrc(
  src?: string | null,
  fallback: string = DEFAULT_COVER_IMAGE,
): string {
  const trimmed = src?.trim();
  if (!trimmed || !isAllowedCoverUrl(trimmed)) return fallback;
  return trimmed;
}

/** Gemini / bot çıktısından kapak URL güvenli seçimi */
export function resolveGeminiCoverUrl(raw: string | undefined, slug: string): string {
  const trimmed = raw?.trim();
  if (trimmed && isAllowedCoverUrl(trimmed)) return trimmed;
  return buildPicsumCoverUrl(slug);
}
