/** Üst menüde görünen ana kategoriler (Yerel ayrı — ProvincePicker) */
export const PRIMARY_NAV_ITEMS = [
  { label: "Gündem", slug: "gundem" },
  { label: "Ekonomi", slug: "ekonomi" },
  { label: "Siyaset", slug: "siyaset" },
  { label: "Asayiş", slug: "asayis" },
  { label: "Spor", slug: "spor" },
  { label: "Teknoloji", slug: "teknoloji" },
  { label: "Magazin", slug: "magazin" },
] as const;

/** Anasayfa kategori vitrini — menü + slider’daki ek dörtlü */
export const HOME_VITRIN_SLUGS: string[] = [
  "gundem",
  "ekonomi",
  "siyaset",
  "asayis",
  "yerel-haberler",
  "spor",
  "teknoloji",
  "magazin",
  "dunya",
  "kultur-sanat",
  "saglik-yasam",
  "otomobil",
];

/** Sağ üst slider menüsünde — arama yanında */
export const MORE_NAV_ITEMS = [
  { label: "Dünya", slug: "dunya" },
  { label: "Kültür Sanat", slug: "kultur-sanat" },
  { label: "Sağlık Yaşam", slug: "saglik-yasam" },
  { label: "Otomobil", slug: "otomobil" },
] as const;

export const GAMES_NAV_ITEM = {
  label: "🎮 Oyunlar",
  href: "/oyunlar",
} as const;

export function categoryHref(slug: string): string {
  return `/kategori/${slug}`;
}
