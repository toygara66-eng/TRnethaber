/**
 * TRNETHABER Anayasa — metin sanitizasyonu (bot ve CMS çıktıları).
 * Rakamlar noktasız kelimeyle; yüzdeler "yüzde …"; kurum eklerinde kesme yok.
 */

const INSTITUTION_APOSTROPHE_PATTERNS: [RegExp, string][] = [
  [/Türkiye Cumhuriyet Merkez Bankası['’]nın/gi, "Türkiye Cumhuriyet Merkez Bankası açıklamasına göre"],
  [/Merkez Bankası['’]nın/gi, "Merkez Bankası verilerine göre"],
  [/Borsa İstanbul['’]un/gi, "Borsa İstanbul verilerine göre"],
  [/İstanbul Büyükşehir Belediyesi['’]nin/gi, "İstanbul Büyükşehir Belediyesi açıklamasına göre"],
  [/Türkiye Büyük Millet Meclisi['’]n[ıi]n/gi, "Türkiye Büyük Millet Meclisine"],
  [/Türkiye Büyük Millet Meclisi['’]ne/gi, "Türkiye Büyük Millet Meclisine"],
  [/([A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]+)\s+Valiliği['’]n[ıi]n/gi, "$1 Valiliğine"],
  [/([A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]+)\s+Valiliği['’]ne/gi, "$1 Valiliğine"],
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

/** Kurum adlarında yasak kesme desenleri (özel isim kesmeleri serbest). */
function hasForbiddenInstitutionApostrophe(text: string): boolean {
  return INSTITUTION_APOSTROPHE_PATTERNS.some(([pattern]) => pattern.test(text));
}

/** Kalan yasak desenleri denetler (kayıt öncesi). */
export function validateConstitution(text: string): string[] {
  const violations: string[] = [];
  if (/%/.test(text)) violations.push("Yüzde sembolü kullanılamaz (yüzde … yazılmalı).");
  if (hasForbiddenInstitutionApostrophe(text)) {
    violations.push(
      "Kurum/makam adlarında kesme işareti kullanılamaz (ör. Merkez Bankası verilerine göre).",
    );
  }
  if (/\d{1,3}[.,]\d{3}/.test(text)) violations.push("Noktalı/virgüllü binlik ayraç kullanılamaz.");
  return violations;
}

const HEADLINE_SMALL_WORDS = new Set([
  "ve",
  "ile",
  "için",
  "de",
  "da",
  "ki",
  "mi",
  "mı",
  "mu",
  "mü",
  "bir",
  "bu",
  "o",
]);

function capitalizeTurkishWord(word: string): string {
  const lower = word.toLocaleLowerCase("tr-TR");
  if (!lower) return word;
  return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
}

function extractProperNounHints(...sources: string[]): Set<string> {
  const hints = new Set<string>();

  for (const source of sources) {
    for (const token of source.split(/\s+/)) {
      const core = token.replace(/^[^A-Za-zÇĞİÖŞÜÂâÎîÛû]+|[^A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû'-]+$/g, "");
      if (!core || core.length < 2) continue;

      if (/^[A-ZÇĞİÖŞÜ][a-zçğıöşü]/.test(core) || /^[A-ZÇĞİÖŞÜ]{2,}$/.test(core)) {
        hints.add(core);
      }
    }
  }

  return hints;
}

/** Başlıkları cümle düzenine (sentence case) çevirir. */
export function applySentenceCaseHeadline(text: string, properNounSources: string[] = []): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const hints = extractProperNounHints(trimmed, ...properNounSources);
  let seenWord = false;

  return trimmed
    .split(/(\s+)/)
    .map((token) => {
      if (/^\s+$/.test(token)) return token;

      const leading = token.match(/^[^A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]+/)?.[0] ?? "";
      const trailing = token.match(/[^A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû'-]+$/)?.[0] ?? "";
      const core = token.slice(leading.length, token.length - trailing.length);
      if (!core) return token;

      const lower = core.toLocaleLowerCase("tr-TR");
      const hintMatch = Array.from(hints).some((hint) => hint.toLocaleLowerCase("tr-TR") === lower);
      const isFirst = !seenWord;
      seenWord = true;

      const shouldCapitalize =
        isFirst || hintMatch || /^[A-ZÇĞİÖŞÜ]{2,}$/.test(core);

      if (shouldCapitalize) {
        return leading + capitalizeTurkishWord(core) + trailing;
      }

      if (!isFirst && HEADLINE_SMALL_WORDS.has(lower)) {
        return leading + lower + trailing;
      }

      return leading + lower + trailing;
    })
    .join("");
}

/** Tüm anayasa kurallarını sırayla uygular. */
export function applyConstitutionRules(text: string): string {
  return sanitizeInstitutionApostrophes(
    sanitizeNumericNotation(sanitizePercentages(sanitizeMarkdownEmphasis(text))),
  );
}
