import { TURKIYE_ILLER } from "@/lib/data/turkiye-iller";

export type City = {
  name: string;
  /** Kısa il slug — RSS ve /kategori/yozgat (örn: yozgat, sanliurfa) */
  slug: string;
};

function yerelCategorySlugToCitySlug(yerelSlug: string): string {
  return yerelSlug.startsWith("yerel-") ? yerelSlug.slice("yerel-".length) : yerelSlug;
}

/** Türkiye 81 il — yerel haber botu ve şehir filtreleri */
export const CITIES: readonly City[] = TURKIYE_ILLER.map((il) => ({
  name: il.name,
  slug: yerelCategorySlugToCitySlug(il.slug),
}));

export function findCityBySlug(slug: string): City | undefined {
  const key = slug.trim().toLocaleLowerCase("tr-TR");
  return CITIES.find((c) => c.slug.toLocaleLowerCase("tr-TR") === key);
}

export function findCityByName(name: string): City | undefined {
  const key = name.trim().toLocaleLowerCase("tr-TR");
  return CITIES.find((c) => c.name.toLocaleLowerCase("tr-TR") === key);
}

/** Cron her turda yalnızca 1 il işler (Vercel timeout koruması) */
export function pickRandomCity(): City {
  const index = Math.floor(Math.random() * CITIES.length);
  return CITIES[index] ?? CITIES[0];
}

export type LocalNewsFeed = {
  id: "google-news" | "haberturk" | "hurriyet";
  name: string;
  url: string;
};

export function buildLocalNewsFeedUrls(city: City): LocalNewsFeed[] {
  const query = encodeURIComponent(`${city.name} yerel haberler`);
  return [
    {
      id: "google-news",
      name: `Google News — ${city.name}`,
      url: `https://news.google.com/rss/search?q=${query}&hl=tr&gl=TR&ceid=TR:tr`,
    },
    {
      id: "haberturk",
      name: `Habertürk Yerel — ${city.name}`,
      url: `https://www.haberturk.com/rss/yerel/${city.slug}`,
    },
    {
      id: "hurriyet",
      name: `Hürriyet — ${city.name}`,
      url: `https://www.hurriyet.com.tr/rss/${city.slug}`,
    },
  ];
}
