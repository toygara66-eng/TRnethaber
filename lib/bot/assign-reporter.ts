import {
  GENERAL_REPORTERS,
  REPORTERS_BY_CITY,
  type ReporterCityKey,
} from "@/lib/bot/reporters";
import { TURKIYE_ILLER } from "@/lib/data/turkiye-iller";
import { turnToEnglishFriendly } from "@/lib/personal/normalize-search";

export type AssignReporterInput = {
  title: string;
  lead?: string;
  body?: string;
  categorySlug?: string;
  categoryName?: string;
  /** RSS kaynağı veya admin şehir alanı */
  explicitCity?: string | null;
};

const CATEGORY_DESK_LABEL: Record<string, string> = {
  gundem: "Gündem Merkezi",
  ekonomi: "Ekonomi Merkezi",
  asayis: "Asayiş Merkezi",
  "yerel-haberler": "Yerel Haberler Merkezi",
  spor: "Spor Merkezi",
  teknoloji: "Teknoloji Merkezi",
  dunya: "Dünya Merkezi",
  "kultur-sanat": "Kültür-Sanat Merkezi",
  "saglik-yasam": "Sağlık Merkezi",
  otomobil: "Otomobil Merkezi",
};

const DEFAULT_DESK = "Haber Merkezi";

/** Uzun il adları önce eşleşsin (Kahramanmaraş / Şanlıurfa vb.) */
const CITIES_BY_NAME_LENGTH = [...TURKIYE_ILLER].sort(
  (a, b) => b.name.length - a.name.length,
);

function normalizeForMatch(text: string): string {
  return turnToEnglishFriendly(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cityAppearsInText(blob: string, cityName: string): boolean {
  const normalizedBlob = normalizeForMatch(blob);
  const normalizedCity = normalizeForMatch(cityName);
  if (!normalizedCity) return false;

  const suffix =
    "(?:'?(?:da|de|ta|te|dan|den|in|in|un|un|li|lu|lu|ya|ye|yi|yi|yu|yu))?";
  const re = new RegExp(
    `(?:^|[^a-z0-9])${escapeRegExp(normalizedCity)}${suffix}(?:[^a-z0-9]|$)`,
    "i",
  );
  return re.test(normalizedBlob);
}

function resolveCityKey(name: string): ReporterCityKey | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const exact = TURKIYE_ILLER.find(
    (il) => il.name.localeCompare(trimmed, "tr", { sensitivity: "base" }) === 0,
  );
  if (exact) return exact.name as ReporterCityKey;

  const normalizedNeedle = normalizeForMatch(trimmed);
  const fuzzy = TURKIYE_ILLER.find(
    (il) => normalizeForMatch(il.name) === normalizedNeedle,
  );
  return fuzzy ? (fuzzy.name as ReporterCityKey) : null;
}

export function detectCityFromArticleText(
  title: string,
  lead?: string,
  body?: string,
): ReporterCityKey | null {
  const blob = [title, lead, body].filter(Boolean).join("\n");
  if (!blob.trim()) return null;

  for (const il of CITIES_BY_NAME_LENGTH) {
    if (cityAppearsInText(blob, il.name)) {
      return il.name as ReporterCityKey;
    }
  }
  return null;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function deskLabel(categorySlug?: string, categoryName?: string): string {
  const slug = categorySlug?.trim().toLowerCase() ?? "";
  if (slug && CATEGORY_DESK_LABEL[slug]) {
    return CATEGORY_DESK_LABEL[slug];
  }
  if (categoryName?.trim()) {
    return `${categoryName.trim()} Merkezi`;
  }
  return DEFAULT_DESK;
}

export function formatCityReporterByline(
  reporterName: string,
  cityName: ReporterCityKey,
): string {
  return `${reporterName} / TRNETHABER ${cityName} Temsilcisi`;
}

export function formatDeskReporterByline(
  reporterName: string,
  desk: string,
): string {
  return `${reporterName} / TRNETHABER ${desk}`;
}

/**
 * Başlık + metinden şehir bulur; il muhabirlerinden veya genel editör havuzundan nöbetçi seçer.
 */
export function assignReporterForArticle(input: AssignReporterInput): string {
  const cityKey =
    resolveCityKey(input.explicitCity ?? "") ??
    detectCityFromArticleText(input.title, input.lead, input.body);

  if (cityKey && REPORTERS_BY_CITY[cityKey]?.length) {
    const reporter = pickRandom(REPORTERS_BY_CITY[cityKey]);
    return formatCityReporterByline(reporter, cityKey);
  }

  const reporter = pickRandom(GENERAL_REPORTERS);
  const desk = deskLabel(input.categorySlug, input.categoryName);
  return formatDeskReporterByline(reporter, desk);
}
