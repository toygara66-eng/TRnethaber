/**
 * Kapak görseli ve logo URL çözümleme — null/boş güvenli fallback.
 */

import { isBlankValue } from "@/lib/safe-display";
import { absoluteUrl } from "@/lib/site";

/** Yerel kapak yedeği — Next Image her zaman kabul eder */
export const PLACEHOLDER_IMAGE = "/placeholder-cover.svg";

/** Uzak ağ hatasında yedek (opsiyonel) */
export const REMOTE_FALLBACK_COVER =
  "https://picsum.photos/seed/trnet-fallback/1920/1080.jpg";

export const DEFAULT_COVER_IMAGE = PLACEHOLDER_IMAGE;

/** Soyut, deterministik Picsum kapak — doğrudan .jpg URL */
export function buildPicsumCoverUrl(seed: string): string {
  const numericSeed = Math.abs(
    (safeSeed(seed) || "trnet")
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0),
  );
  return `https://picsum.photos/seed/${numericSeed}/1920/1080.jpg`;
}

function safeSeed(seed: string): string {
  return seed.trim() || "trnet";
}

function isPrivateOrLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".local") ||
    h.startsWith("192.168.") ||
    h.startsWith("10.") ||
    h.startsWith("172.16.") ||
    h.startsWith("172.17.") ||
    h.startsWith("172.18.") ||
    h.startsWith("172.19.") ||
    /^172\.(2[0-9]|3[0-1])\./.test(h)
  );
}

/** Haber kapakları için geniş izin — RSS / CDN / Supabase URL'leri */
export function isAllowedCoverUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (isPrivateOrLocalHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function isLocalImageSrc(src: string): boolean {
  const trimmed = src.trim();
  return trimmed.startsWith("/") && !trimmed.startsWith("//");
}

/** Yerel public yolu veya uzak URL; geçersizse fallback */
export function resolveCoverImageSrc(
  src?: string | null,
  fallback: string = DEFAULT_COVER_IMAGE,
): string {
  if (isBlankValue(src)) return normalizeImageFallback(fallback);

  let trimmed = String(src).trim();

  if (trimmed.startsWith("//")) {
    trimmed = `https:${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return normalizeImageFallback(fallback);
  }

  if (!isAllowedCoverUrl(trimmed)) {
    return normalizeImageFallback(fallback);
  }

  return trimmed;
}

function normalizeImageFallback(fallback: string): string {
  const fb = fallback.trim() || PLACEHOLDER_IMAGE;
  return fb.startsWith("/") || fb.startsWith("http") ? fb : PLACEHOLDER_IMAGE;
}

/** Schema.org ve meta için mutlak logo URL */
export function resolveSiteLogoUrl(
  src?: string | null,
  fallbackPath = "/logo.svg",
): string {
  if (isBlankValue(src)) {
    return absoluteUrl(fallbackPath.startsWith("/") ? fallbackPath : `/${fallbackPath}`);
  }

  const trimmed = String(src).trim();

  if (trimmed.startsWith("/")) {
    return absoluteUrl(trimmed);
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return isAllowedCoverUrl(trimmed) ? trimmed : absoluteUrl(fallbackPath);
  }

  return absoluteUrl(fallbackPath);
}

/** Gemini / bot çıktısından kapak URL güvenli seçimi */
export function resolveGeminiCoverUrl(raw: string | undefined, slug: string): string {
  const trimmed = raw?.trim();
  if (trimmed && !isBlankValue(trimmed)) {
    const resolved = resolveCoverImageSrc(trimmed, PLACEHOLDER_IMAGE);
    if (resolved !== PLACEHOLDER_IMAGE || trimmed.startsWith("/")) return resolved;
    if (isAllowedCoverUrl(trimmed)) return trimmed;
  }
  return buildPicsumCoverUrl(slug);
}
