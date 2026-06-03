import { TURKIYE_ILLER } from "@/lib/data/turkiye-iller";
import {
  normalizeTitleForComparison,
  titleSimilarityRatio,
} from "@/lib/articles/title-similarity";

export type SpecialDuplicateGroup = "kimdir" | "seyahat";

const SPECIAL_CATEGORY_SLUGS: Record<string, SpecialDuplicateGroup> = {
  kimdir: "kimdir",
  seyahat: "seyahat",
  gezi: "seyahat",
};

const GENERIC_CAPITALIZED_WORDS = new Set(
  [
    "kimdir",
    "kim",
    "seyahat",
    "gezi",
    "rehber",
    "haber",
    "gundem",
    "turkiye",
    "türkiye",
    "son",
    "dakika",
    "nedir",
    "nasıl",
    "nerede",
    "ne",
    "zaman",
    "neden",
    "detaylar",
    "video",
    "foto",
    "galeri",
  ].map((w) => normalizeTitleForComparison(w)),
);

const KIMDIR_PATTERN_WORDS = new Set(
  ["kimdir", "kim", "biyografi", "hayati", "hayat", "oldu", "oludu", "nedir", "kisi", "kişi"].map(
    (w) => normalizeTitleForComparison(w),
  ),
);

const SEYAHAT_PATTERN_WORDS = new Set(
  [
    "seyahat",
    "gezi",
    "rehber",
    "gezilecek",
    "rotasi",
    "rota",
    "tatil",
    "nerede",
    "yerler",
    "sehir",
    "şehir",
  ].map((w) => normalizeTitleForComparison(w)),
);

const CITY_NAMES_NORMALIZED = TURKIYE_ILLER.map((il) =>
  normalizeTitleForComparison(il.name),
).sort((a, b) => b.length - a.length);

const PROPER_NAME_REGEX =
  /(?:^|[\s"'“”«»\-–—])([A-ZÇĞİÖŞÜÂÎÛ][a-zçğıöşüâîû]+(?:\s+[A-ZÇĞİÖŞÜÂÎÛ][a-zçğıöşüâîû]+)*)/g;

export function getSpecialDuplicateGroup(
  categorySlug: string | null | undefined,
): SpecialDuplicateGroup | null {
  const key = (categorySlug ?? "").trim().toLowerCase();
  return SPECIAL_CATEGORY_SLUGS[key] ?? null;
}

export function isGeneralDuplicateCategory(categorySlug: string | null | undefined): boolean {
  return getSpecialDuplicateGroup(categorySlug) === null;
}

function titleTokens(title: string): string[] {
  return normalizeTitleForComparison(title).split(" ").filter((w) => w.length > 1);
}

function extractCityTokens(title: string): string[] {
  const normalized = normalizeTitleForComparison(title);
  const found: string[] = [];
  for (const city of CITY_NAMES_NORMALIZED) {
    if (city.length < 3) continue;
    const re = new RegExp(`(?:^|\\s)${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`);
    if (re.test(normalized)) {
      found.push(city);
    }
  }
  return found;
}

/** Başlıktaki özel isim ve şehir adları (birebir eşleşme için). */
export function extractDistinctiveTokens(title: string): string[] {
  const tokens = new Set<string>();

  for (const city of extractCityTokens(title)) {
    tokens.add(city);
  }

  let match: RegExpExecArray | null;
  PROPER_NAME_REGEX.lastIndex = 0;
  while ((match = PROPER_NAME_REGEX.exec(title)) !== null) {
    const phrase = match[1]?.trim();
    if (!phrase) continue;
    const normalized = normalizeTitleForComparison(phrase);
    if (normalized.length < 2) continue;
    if (GENERIC_CAPITALIZED_WORDS.has(normalized)) continue;
    if (CITY_NAMES_NORMALIZED.includes(normalized)) {
      tokens.add(normalized);
      continue;
    }
    tokens.add(normalized);
    for (const word of normalized.split(" ")) {
      if (word.length >= 3 && !GENERIC_CAPITALIZED_WORDS.has(word)) {
        tokens.add(word);
      }
    }
  }

  return Array.from(tokens);
}

function sharedDistinctiveTokens(titleA: string, titleB: string): string[] {
  const setB = new Set(extractDistinctiveTokens(titleB));
  return extractDistinctiveTokens(titleA).filter((t) => setB.has(t));
}

function hasCategoryPatternWords(
  title: string,
  group: SpecialDuplicateGroup,
): boolean {
  const words = titleTokens(title);
  const pattern = group === "kimdir" ? KIMDIR_PATTERN_WORDS : SEYAHAT_PATTERN_WORDS;
  for (let i = 0; i < words.length; i++) {
    if (pattern.has(words[i])) return true;
  }
  return false;
}

function skeletonSimilarity(titleA: string, titleB: string, removeTokens: string[]): number {
  const remove = new Set(removeTokens);
  const skeleton = (title: string) =>
    titleTokens(title)
      .filter((w) => !remove.has(w))
      .join(" ");

  return titleSimilarityRatio(skeleton(titleA), skeleton(titleB));
}

/**
 * Kimdir / Seyahat: düz yüzde benzerliği yetmez; ortak özel isim veya şehir + kalıp eşleşmesi gerekir.
 */
export function areSpecialCategoryDuplicates(
  titleA: string,
  titleB: string,
  group: SpecialDuplicateGroup,
): { duplicate: boolean; sharedToken: string | null } {
  const shared = sharedDistinctiveTokens(titleA, titleB);
  if (shared.length === 0) {
    return { duplicate: false, sharedToken: null };
  }

  const patternOk =
    hasCategoryPatternWords(titleA, group) && hasCategoryPatternWords(titleB, group);

  const skeletonOk = skeletonSimilarity(titleA, titleB, shared) >= 0.55;

  if (!patternOk && !skeletonOk) {
    return { duplicate: false, sharedToken: null };
  }

  const primary =
    shared.find((t) => t.includes(" ") || t.length >= 5) ?? shared[0] ?? null;

  return { duplicate: true, sharedToken: primary };
}

export function specialCategoryDisplayLabel(group: SpecialDuplicateGroup): string {
  return group === "kimdir" ? "Kimdir" : "Seyahat";
}
