import { resolveCoverImageSrc } from "@/lib/images/cover";
import { isBlankValue, safeSlug, safeText } from "@/lib/safe-display";
import type { HomeCard } from "@/lib/types/home";

/** Boş veya geçersiz slug — Link / url.parse hatası önleme */
export function haberArticleHref(slug?: string | null): string {
  if (isBlankValue(slug)) return "#";
  const cleaned = safeSlug(slug, "");
  return cleaned ? `/haber/${cleaned}` : "#";
}

/** Liste kartı — null kapak, slug ve başlık için çelik yelek */
export function normalizeHomeCard(card: HomeCard): HomeCard {
  const title = safeText(card.title, "Haber");
  const slug = safeSlug(card.slug, "haber");
  const viewCount =
    typeof card.viewCount === "number" && Number.isFinite(card.viewCount)
      ? Math.max(0, card.viewCount)
      : 0;

  const dek = card.dek?.trim();

  return {
    id: safeText(card.id, slug || "card"),
    slug,
    title,
    ...(dek ? { dek } : {}),
    category: safeText(card.category, "Gündem"),
    categorySlug: safeText(card.categorySlug, "gundem"),
    viewCount,
    imageSrc: resolveCoverImageSrc(card.imageSrc),
    imageAlt: safeText(card.imageAlt, `${title} kapak görseli`),
    hasCoverImage: Boolean(card.hasCoverImage) || !isBlankValue(card.imageSrc),
  };
}
