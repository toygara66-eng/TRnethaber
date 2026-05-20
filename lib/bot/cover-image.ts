import { buildPicsumCoverUrl } from "@/lib/images/cover";

/**
 * Unsplash — soyut, kurumsal (temiz URL; ek policy parametresi yok).
 */
const ABSTRACT_COVERS = [
  "https://images.unsplash.com/photo-1486406146926-c627a92fd1b2?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3f42944f1c2?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1473341304170-971dccb3ac1e?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1920&q=80",
] as const;

export function buildUnsplashCoverUrl(seed: string): string {
  const index =
    Math.abs(seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) %
    ABSTRACT_COVERS.length;
  return ABSTRACT_COVERS[index];
}

/** Bot için garantili doğrudan .jpg kapak (Picsum) */
export { buildPicsumCoverUrl };

export function coverImageAlt(title: string): string {
  return `${title} kapak görseli, soyut kurumsal, yüz ve yazı yok`;
}
