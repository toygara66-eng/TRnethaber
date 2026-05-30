import { applyConstitutionRules } from "@/lib/constitution/text";

/** Gemini sistem promptlarına eklenecek spot özet kuralı */
export const GEMINI_SUMMARY_SPOT_RULE = `ÖZET (summary) KURALI (ZORUNLU):
- Haberin özetini (summary) EN FAZLA 2 tam cümle olacak şekilde yaz.
- Her cümle nokta, soru veya ünlem ile bitsin; asla yarım cümle bırakma.
- Asla cümlenin veya kelimenin ortasında metni kesme; karakter sınırı için kelime yarımı bırakma.`;

/**
 * Spot / dek — AI çıktısı olduğu gibi (kör slice yok).
 */
export function normalizeArticleSpotSummary(raw: string, fallback = ""): string {
  const text = applyConstitutionRules(raw.trim());
  return text || fallback;
}

/**
 * Meta description — yalnızca SEO alanı; cümle veya kelime sınırında keser.
 */
export function normalizeMetaDescription(
  raw: string,
  fallback: string,
  maxChars = 160,
): string {
  const text = applyConstitutionRules(raw.trim()) || fallback;
  return truncateAtWordOrSentenceBoundary(text, maxChars);
}

function truncateAtWordOrSentenceBoundary(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;

  const window = trimmed.slice(0, maxChars + 1);
  const sentenceEnd = /[.!?…](?:["')\]]*)\s/g;
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = sentenceEnd.exec(window)) !== null) {
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd > 0) {
    const bySentence = window.slice(0, lastEnd).trim();
    if (bySentence.length >= Math.min(48, maxChars * 0.45)) {
      return bySentence;
    }
  }

  const slice = trimmed.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.55) {
    return slice.slice(0, lastSpace).trim();
  }

  return slice.trim();
}
