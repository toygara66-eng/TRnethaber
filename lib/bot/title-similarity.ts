/** Agresif başlık duplicate — normalize sonrası eşik %85 */
export const TITLE_SIMILARITY_THRESHOLD = 0.85;

/** Son N haber başlığı ile fuzzy karşılaştırma */
export const TITLE_FUZZY_RECENT_LIMIT = 50;

const TR_LOWER = "tr-TR";

/**
 * Agresif başlık normalizasyonu:
 * - küçük harf
 * - noktalama, tırnak, kesme, boşluk vb. SİLİNİR
 * - yalnızca harf ve rakam kalır
 */
export function normalizeTitleAggressive(title: string): string {
  return title
    .trim()
    .toLocaleLowerCase(TR_LOWER)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ğüşıöçâîû]/gi, "");
}

/** @deprecated — geriye dönük; agresif normalize kullanın */
export function normalizeTitleKey(title: string): string {
  return normalizeTitleAggressive(title);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  );

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

/** 0–1 benzerlik — birebir aynı normalize metin = 1 */
export function computeTitleSimilarity(a: string, b: string): number {
  const na = normalizeTitleAggressive(a);
  const nb = normalizeTitleAggressive(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshteinDistance(na, nb);
  return 1 - dist / maxLen;
}

export function isSimilarTitle(
  a: string,
  b: string,
  threshold = TITLE_SIMILARITY_THRESHOLD,
): boolean {
  return computeTitleSimilarity(a, b) >= threshold;
}
