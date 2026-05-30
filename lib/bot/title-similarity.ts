/** Başlık duplicate taraması — varsayılan eşik %90 */
export const TITLE_SIMILARITY_THRESHOLD = 0.9;

const TR_LOWER = "tr-TR";

/** Karşılaştırma için başlık anahtarı (noktalama/kesme/boşluk normalize) */
export function normalizeTitleKey(title: string): string {
  return title
    .trim()
    .toLocaleLowerCase(TR_LOWER)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`´]/g, "")
    .replace(/[^a-z0-9ğüşıöçâîû\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(text: string): string[] {
  if (text.length < 2) return text ? [text] : [];
  const grams: string[] = [];
  for (let i = 0; i < text.length - 1; i++) {
    grams.push(text.slice(i, i + 2));
  }
  return grams;
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const gramsA = bigrams(a);
  const gramsB = bigrams(b);
  if (gramsA.length === 0 || gramsB.length === 0) return 0;

  const countsB = new Map<string, number>();
  for (const g of gramsB) countsB.set(g, (countsB.get(g) ?? 0) + 1);

  let overlap = 0;
  for (const g of gramsA) {
    const n = countsB.get(g) ?? 0;
    if (n > 0) {
      overlap += 1;
      countsB.set(g, n - 1);
    }
  }

  return (2 * overlap) / (gramsA.length + gramsB.length);
}

/** 0–1 arası benzerlik (Dice + tam eşleşme önceliği) */
export function computeTitleSimilarity(a: string, b: string): number {
  const na = normalizeTitleKey(a);
  const nb = normalizeTitleKey(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (longer.includes(shorter) && shorter.length >= 24) {
    return Math.max(0.92, diceCoefficient(na, nb));
  }

  return diceCoefficient(na, nb);
}

export function isSimilarTitle(
  a: string,
  b: string,
  threshold = TITLE_SIMILARITY_THRESHOLD,
): boolean {
  return computeTitleSimilarity(a, b) >= threshold;
}
