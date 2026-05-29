/** Ön yüzde asla gösterilmeyecek bot / teknik yazar ifadeleri */
const MASKED_AUTHOR_PATTERNS = [
  /\bbot\b/i,
  /otonom/i,
  /içerik\s*motoru/i,
  /otomatik/i,
  /cron/i,
  /pipeline/i,
  /rss/i,
  /gemini/i,
  /trnethaber\s*editör\s*masası/i,
];

/** Kategori slug → kurumsal yazar masası */
const CATEGORY_DESK_BY_SLUG: Record<string, string> = {
  gundem: "Gündem Masası",
  ekonomi: "TRNetHaber Ekonomi",
  asayis: "TRNetHaber Asayiş",
  "yerel-haberler": "TRNetHaber Yerel",
  spor: "TRNetHaber Spor",
  teknoloji: "TRNetHaber Teknoloji",
  dunya: "TRNetHaber Dünya",
  "kultur-sanat": "TRNetHaber Kültür-Sanat",
  "saglik-yasam": "TRNetHaber Sağlık",
  otomobil: "TRNetHaber Otomobil",
};

const DEFAULT_DESK = "TRNetHaber Editörlük";

function isReporterByline(raw: string): boolean {
  return /\s\/\s+TRNETHABER\s+/i.test(raw) && /temsilcisi|merkezi/i.test(raw);
}

function shouldMaskAuthor(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (isReporterByline(trimmed)) return false;
  return MASKED_AUTHOR_PATTERNS.some((re) => re.test(trimmed));
}

function deskFromCategoryName(categoryName: string): string {
  const name = categoryName.trim();
  if (!name) return DEFAULT_DESK;
  if (/masası$/i.test(name)) return name;
  return `${name} Masası`;
}

/**
 * Bot / teknik yazar adlarını maskeleyerek ön yüzde kurumsal editör adı döner.
 */
export function resolveDisplayAuthor(
  rawAuthor: string | null | undefined,
  categorySlug: string,
  categoryName?: string,
): string {
  const raw = rawAuthor?.trim() ?? "";

  if (raw && !shouldMaskAuthor(raw)) {
    return raw;
  }

  const slug = categorySlug.trim().toLowerCase();
  if (slug && CATEGORY_DESK_BY_SLUG[slug]) {
    return CATEGORY_DESK_BY_SLUG[slug];
  }

  if (categoryName?.trim()) {
    return deskFromCategoryName(categoryName);
  }

  return DEFAULT_DESK;
}
