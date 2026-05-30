/**
 * TRNETHABER Anayasa — metin sanitizasyonu (bot ve CMS çıktıları).
 * Rakamlar noktasız kelimeyle; yüzdeler "yüzde …"; kurum eklerinde kesme yok.
 */

const INSTITUTION_APOSTROPHE_PATTERNS: [RegExp, string][] = [
  [/Türkiye Cumhuriyet Merkez Bankası['’]nın/gi, "Türkiye Cumhuriyet Merkez Bankası açıklamasına göre"],
  [/Merkez Bankası['’]nın/gi, "Merkez Bankası verilerine göre"],
  [/Borsa İstanbul['’]un/gi, "Borsa İstanbul verilerine göre"],
  [/İstanbul Büyükşehir Belediyesi['’]nin/gi, "İstanbul Büyükşehir Belediyesi açıklamasına göre"],
];

/** Yüzde sembollerini kelime formatına çevirir. */
export function sanitizePercentages(text: string): string {
  let out = text;

  out = out.replace(/%\s*(\d+(?:[.,]\d+)?)/g, (_, n) => `yüzde ${normalizeDigitToken(n)}`);
  out = out.replace(/(\d+(?:[.,]\d+)?)\s*%/g, (_, n) => `yüzde ${normalizeDigitToken(n)}`);
  out = out.replace(/%/g, "yüzde ");

  return out.replace(/\s+/g, " ").trim();
}

/** Kesme işaretli kurum eklerini düzleştirir (özel ad kesmeleri korunur). */
export function sanitizeInstitutionApostrophes(text: string): string {
  let out = text;
  for (const [pattern, replacement] of INSTITUTION_APOSTROPHE_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Markdown vurguyu HTML strong'a çevirir veya kaldırır */
export function sanitizeMarkdownEmphasis(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "$1");
}

/**
 * Noktalı / virgüllü sayı gösterimlerini kelime formatına yaklaştırır.
 * Örn: 15.350 -> 15 bin 350 | 1,2 milyon -> 1 virgül 2 milyon
 */
export function sanitizeNumericNotation(text: string): string {
  let out = text;

  out = out.replace(
    /\b(\d{1,3})\.(\d{3})\b/g,
    (_, a, b) => `${a} bin ${b}`,
  );
  out = out.replace(
    /\b(\d{1,3}),(\d{3})\b/g,
    (_, a, b) => `${a} bin ${b}`,
  );
  out = out.replace(
    /\b(\d+)[.,](\d+)\b/g,
    (_, a, b) => `${a} virgül ${b}`,
  );

  return out.replace(/\s+/g, " ").trim();
}

function normalizeDigitToken(token: string): string {
  return token.replace(/\./g, " bin ").replace(/,/g, " virgül ").replace(/\s+/g, " ").trim();
}

/** Kalan yasak desenleri denetler (kayıt öncesi). */
export function validateConstitution(text: string): string[] {
  const violations: string[] = [];
  if (/%/.test(text)) violations.push("Yüzde sembolü kullanılamaz (yüzde … yazılmalı).");
  if (/['’]/.test(text)) violations.push("Kesme işareti kullanılamaz.");
  if (/\d{1,3}[.,]\d{3}/.test(text)) violations.push("Noktalı/virgüllü binlik ayraç kullanılamaz.");
  return violations;
}

/** Tüm anayasa kurallarını sırayla uygular. */
export function applyConstitutionRules(text: string): string {
  return sanitizeInstitutionApostrophes(
    sanitizeNumericNotation(sanitizePercentages(sanitizeMarkdownEmphasis(text))),
  );
}
