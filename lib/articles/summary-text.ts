import { applyConstitutionRules } from "@/lib/constitution/text";
import { decodeEscapedArticleHtml, stripHtmlTags } from "@/lib/articles/html-content";

/** Gemini / OpenRouter sistem promptlarına eklenecek spot özet kuralı */
export const GEMINI_SUMMARY_SPOT_RULE = `ÖZET (summary / spot) KURALI (ZORUNLU):
- Haberin özetini (summary) EN FAZLA 2 tam cümle olacak şekilde yaz.
- Her cümle nokta, soru veya ünlem ile bitsin; asla yarım cümle bırakma.
- Asla cümlenin veya kelimenin ortasında metni kesme; karakter sınırı için kelime yarımı bırakma.
- Özet (spot) alanında KESİNLİKLE hiçbir HTML etiketi (strong, b, em, br vb.) veya Markdown işareti (**, _, #) kullanma.
- Spot metni yalnızca düz, temiz metin (plain text) olmalıdır; vurgu için yalnızca tırnak veya kelime seçimi kullan.`;

/** Spot alanı için düz metin — HTML/Markdown temizliği */
export function stripSpotToPlainText(raw: string): string {
  let text = raw.trim();
  if (!text) return "";

  text = decodeEscapedArticleHtml(text);
  text = stripHtmlTags(text);
  text = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/**
 * Spot / dek — anayasa kuralları + düz metin (HTML/Markdown yok).
 */
export function normalizeArticleSpotSummary(raw: string, fallback = ""): string {
  const plain = stripSpotToPlainText(applyConstitutionRules(raw.trim()));
  return plain || (fallback ? stripSpotToPlainText(fallback) : "");
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
