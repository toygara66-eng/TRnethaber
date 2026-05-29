import { isLocalCategorySlug } from "@/lib/categories/slug-resolve";

export const EMERGENCY_HEADLINE_KEYWORDS = [
  "deprem",
  "afet",
  "acil",
  "son dakika",
] as const;

function normalizeHeadlineText(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function hasEmergencyHeadlineKeyword(
  title: string,
  summary?: string | null,
): boolean {
  const blob = normalizeHeadlineText(`${title} ${summary ?? ""}`);
  return EMERGENCY_HEADLINE_KEYWORDS.some((kw) =>
    blob.includes(normalizeHeadlineText(kw)),
  );
}

export type HeadlineEligibilityInput = {
  categorySlug?: string | null;
  title: string;
  summary?: string | null;
  /** Gelecekte DB is_headline sütunu eklenirse */
  isHeadline?: boolean | null;
};

/**
 * Ulusal manşet / hero için uygunluk.
 * Yerel kategoriler varsayılan olarak manşete çıkmaz; acil anahtar kelimeler istisna.
 */
export function isEligibleForNationalHeadline(input: HeadlineEligibilityInput): boolean {
  if (input.isHeadline === false) return false;
  if (!isLocalCategorySlug(input.categorySlug)) return true;
  return hasEmergencyHeadlineKeyword(input.title, input.summary);
}
