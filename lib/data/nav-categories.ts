/** Menü çubuğunda doğrudan görünen ilk 5 ana kategori */
export const NAV_BAR_PRIMARY_ITEMS = [
  { label: "Gündem", slug: "gundem" },
  { label: "Ekonomi", slug: "ekonomi" },
  { label: "Spor", slug: "spor" },
  { label: "Siyaset", slug: "siyaset" },
  { label: "Magazin", slug: "magazin" },
] as const;

/** Masaüstü “Daha Fazla” açılır menüsü + mobil tam liste */
export const NAV_BAR_MORE_ITEMS = [
  { label: "Asayiş", slug: "asayis" },
  { label: "Teknoloji", slug: "teknoloji" },
  { label: "Dünya", slug: "dunya" },
  { label: "Kültür Sanat", slug: "kultur-sanat" },
  { label: "Sağlık Yaşam", slug: "saglik-yasam" },
  { label: "Otomobil", slug: "otomobil" },
  { label: "Seyahat", slug: "seyahat" },
  { label: "Kimdir", slug: "kimdir" },
] as const;

/** @deprecated — feed-layout etiketleri; NAV_BAR_* birleşimi kullanın */
export const PRIMARY_NAV_ITEMS = NAV_BAR_PRIMARY_ITEMS;

/** @deprecated — feed-layout; NAV_BAR_MORE_ITEMS kullanın */
export const MORE_NAV_ITEMS = NAV_BAR_MORE_ITEMS;

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
  "seyahat",
];

export const GAMES_NAV_ITEM = {
  label: "🎮 Oyunlar",
  href: "/oyunlar",
} as const;

export function categoryHref(slug: string): string {
  return `/kategori/${slug}`;
}

export const ALL_NAV_CATEGORY_ITEMS = [
  ...NAV_BAR_PRIMARY_ITEMS,
  ...NAV_BAR_MORE_ITEMS,
] as const;
