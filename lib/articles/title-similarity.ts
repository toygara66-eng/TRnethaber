/** Başlık karşılaştırması için normalize (Türkçe duyarlı küçük harf). */
export function normalizeTitleForComparison(title: string): string {
  return title
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ğüşıöçâîû\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeTitle(title: string): Set<string> {
  const normalized = normalizeTitleForComparison(title);
  if (!normalized) return new Set();
  return new Set(
    normalized.split(" ").filter((word) => word.length > 0),
  );
}

/** Jaccard: kelime kümesi örtüşmesi (0–1). */
export function jaccardTitleSimilarity(a: string, b: string): number {
  const setA = tokenizeTitle(a);
  const setB = tokenizeTitle(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  setA.forEach((word) => {
    if (setB.has(word)) intersection += 1;
  });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array<number>(cols).fill(0),
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

/** Levenshtein: normalize edilmiş tam metin benzerliği (0–1). */
export function levenshteinTitleSimilarity(a: string, b: string): number {
  const sa = normalizeTitleForComparison(a);
  const sb = normalizeTitleForComparison(b);
  if (sa === sb) return 1;
  if (!sa || !sb) return 0;

  const distance = levenshteinDistance(sa, sb);
  const maxLen = Math.max(sa.length, sb.length);
  return 1 - distance / maxLen;
}

/**
 * İki başlık arasındaki benzerlik oranı (0–1).
 * Kelime (Jaccard) ve harf (Levenshtein) ölçümlerinin en yükseği alınır.
 */
export function titleSimilarityRatio(a: string, b: string): number {
  if (!a.trim() || !b.trim()) return 0;
  return Math.max(
    jaccardTitleSimilarity(a, b),
    levenshteinTitleSimilarity(a, b),
  );
}
