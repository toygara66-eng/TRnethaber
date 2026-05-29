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
