import type { CategoryRow } from "@/lib/supabase/rows";

/** Türkçe karakter + ayraç toleransı için karşılaştırma anahtarı */
export function normalizeCategorySlugKey(slug: string): string {
  return slug
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Yerel haberler üst kategorisi — DB'de yerel veya yerel-haberler olabilir */
const YEREL_HUB_KEYS = new Set(["yerel", "yerel-haberler", "yerelhaberler"]);

export function isYerelHubSlug(slug: string | null | undefined): boolean {
  if (!slug?.trim()) return false;
  return YEREL_HUB_KEYS.has(normalizeCategorySlugKey(slug));
}

export function isYerelProvinceSlug(slug: string | null | undefined): boolean {
  if (!slug?.trim()) return false;
  const key = normalizeCategorySlugKey(slug);
  return key.startsWith("yerel-") && !YEREL_HUB_KEYS.has(key);
}

export function isLocalCategorySlug(slug: string | null | undefined): boolean {
  return isYerelHubSlug(slug) || isYerelProvinceSlug(slug);
}

function yerelHubAliasKeys(): string[] {
  return ["yerel", "yerel-haberler", "yerelhaberler"];
}

/** URL parametresi için olası eşleşme anahtarları */
export function expandCategorySlugKeys(slugParam: string): string[] {
  const key = normalizeCategorySlugKey(slugParam);
  const keys = new Set<string>([key]);
  if (YEREL_HUB_KEYS.has(key)) {
    for (const alias of yerelHubAliasKeys()) {
      keys.add(alias);
    }
  }
  return Array.from(keys);
}

export function decodeCategorySlugParam(slugParam: string): string {
  try {
    return decodeURIComponent(slugParam).trim();
  } catch {
    return slugParam.trim();
  }
}

/**
 * Supabase categories listesinde slug / isim ile eşleşen kaydı bulur.
 */
export function matchCategoryFromList(
  slugParam: string,
  categories: CategoryRow[],
): CategoryRow | null {
  const decoded = decodeCategorySlugParam(slugParam);
  if (!decoded) return null;

  const wantedKeys = expandCategorySlugKeys(decoded);

  for (const cat of categories) {
    if (cat.slug === decoded) return cat;
  }

  for (const cat of categories) {
    const catKey = normalizeCategorySlugKey(cat.slug);
    if (wantedKeys.includes(catKey)) return cat;
  }

  const nameKey = normalizeCategorySlugKey(decoded);
  for (const cat of categories) {
    if (normalizeCategorySlugKey(cat.name) === nameKey) return cat;
  }

  return null;
}
