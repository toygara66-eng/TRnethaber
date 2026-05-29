/**
 * Türkçe karakter / büyük-küçük harf duyarsız karşılaştırma için normalize.
 */
export function turnToEnglishFriendly(str: string): string {
  return str
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i")
    .trim();
}

export function includesNormalized(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return turnToEnglishFriendly(haystack).includes(turnToEnglishFriendly(needle));
}
