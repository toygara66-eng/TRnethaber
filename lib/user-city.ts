import { normalizeCategorySlugKey } from "@/lib/categories/slug-resolve";
import { TURKIYE_ILLER, type TurkiyeIl } from "@/lib/data/turkiye-iller";

export const USER_CITY_STORAGE_KEY = "user_city";
export const USER_CITY_CHANGED_EVENT = "trnet-user-city-changed";

export function findIlByName(cityName: string): TurkiyeIl | undefined {
  const normalized = cityName.trim().toLocaleLowerCase("tr");
  return TURKIYE_ILLER.find(
    (il) => il.name.toLocaleLowerCase("tr") === normalized,
  );
}

export function getYerelSlugForCity(cityName: string): string | null {
  return findIlByName(cityName)?.slug ?? null;
}

/** `yerel-yozgat` → `yozgat` */
export function getCitySlugFromYerelCategorySlug(yerelSlug: string): string {
  const key = normalizeCategorySlugKey(yerelSlug);
  return key.startsWith("yerel-") ? key.slice("yerel-".length) : key;
}

/**
 * URL slug'ından il bulur: `yozgat`, `yerel-yozgat`, `Yozgat` vb.
 */
export function findIlBySlug(slugParam: string): TurkiyeIl | undefined {
  const key = normalizeCategorySlugKey(slugParam);
  if (!key) return undefined;

  const exact = TURKIYE_ILLER.find(
    (il) => normalizeCategorySlugKey(il.slug) === key,
  );
  if (exact) return exact;

  const short = TURKIYE_ILLER.find(
    (il) => getCitySlugFromYerelCategorySlug(il.slug) === key,
  );
  if (short) return short;

  return TURKIYE_ILLER.find(
    (il) => normalizeCategorySlugKey(il.name) === key,
  );
}

export function isValidCityName(cityName: string): boolean {
  return Boolean(findIlByName(cityName));
}

export function readUserCityFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_CITY_STORAGE_KEY);
    const city = raw?.trim();
    if (!city || !isValidCityName(city)) return null;
    return findIlByName(city)!.name;
  } catch {
    return null;
  }
}

export function writeUserCityToStorage(cityName: string): void {
  if (typeof window === "undefined") return;
  const il = findIlByName(cityName);
  if (!il) return;
  window.localStorage.setItem(USER_CITY_STORAGE_KEY, il.name);
  document.cookie = `${USER_CITY_STORAGE_KEY}=${encodeURIComponent(il.name)}; path=/; max-age=31536000; SameSite=Lax`;
  window.dispatchEvent(
    new CustomEvent<string>(USER_CITY_CHANGED_EVENT, { detail: il.name }),
  );
}

export function clearUserCityStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_CITY_STORAGE_KEY);
  document.cookie = `${USER_CITY_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}
