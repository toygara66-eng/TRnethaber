/** Üst menüde görünen ana kategoriler (Yerel ayrı — ProvincePicker) */
export const PRIMARY_NAV_ITEMS = [
  { label: "Gündem", slug: "gundem" },
  { label: "Ekonomi", slug: "ekonomi" },
  { label: "Asayiş", slug: "asayis" },
  { label: "Spor", slug: "spor" },
  { label: "Teknoloji", slug: "teknoloji" },
] as const;

/** Anasayfa kategori vitrini — menü + slider’daki ek dörtlü */
export const HOME_VITRIN_SLUGS: string[] = [
  "gundem",
  "ekonomi",
  "asayis",
  "yerel-haberler",
  "spor",
  "teknoloji",
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

export function categoryHref(slug: string): string {
  return `/kategori/${slug}`;
}
