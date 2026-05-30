/**
 * Çekirdek haber kategorileri — menü, vitrin, bot RSS ve Supabase slug eşlemesi.
 */
export const CORE_CATEGORY_DEFINITIONS = [
  { slug: "gundem", name: "Gündem" },
  { slug: "ekonomi", name: "Ekonomi" },
  { slug: "siyaset", name: "Siyaset" },
  { slug: "asayis", name: "Asayiş" },
  { slug: "spor", name: "Spor" },
  { slug: "teknoloji", name: "Teknoloji" },
  { slug: "magazin", name: "Magazin" },
  { slug: "dunya", name: "Dünya" },
  { slug: "kultur-sanat", name: "Kültür Sanat" },
  { slug: "saglik-yasam", name: "Sağlık Yaşam" },
  { slug: "otomobil", name: "Otomobil" },
  { slug: "yerel-haberler", name: "Yerel Haberler" },
] as const;

export type CoreCategorySlug = (typeof CORE_CATEGORY_DEFINITIONS)[number]["slug"];

export const BOT_RSS_CATEGORY_SLUGS = [
  "gundem",
  "ekonomi",
  "siyaset",
  "spor",
  "teknoloji",
  "magazin",
  "dunya",
  "kultur-sanat",
  "saglik-yasam",
  "otomobil",
] as const;

export type BotRssCategorySlug = (typeof BOT_RSS_CATEGORY_SLUGS)[number];
