import type { BotRssCategorySlug } from "@/lib/data/core-categories";

/** Gemini'nin seçebileceği slug listesi (prompt ile birebir) */
export const NEWS_BOT_GEMINI_CATEGORY_SLUGS = [
  "gundem",
  "ekonomi",
  "dunya",
  "spor",
  "teknoloji",
  "magazin",
  "saglik",
  "otomobil",
  "kultur-sanat",
] as const;

export type NewsBotGeminiCategorySlug = (typeof NEWS_BOT_GEMINI_CATEGORY_SLUGS)[number];

export const GEMINI_NEWS_CATEGORY_RULE = `Kategoriyi SADECE şu listeden seç: gundem, ekonomi, dunya, spor, teknoloji, magazin, saglik, otomobil, kultur-sanat. EĞER HABER SİYASETSE KESİNLİKLE "gundem" YAP. Alakasız kategoriler eşleştirme. Listede olmayan bir kategori uydurma.`;

const GEMINI_TO_DB_SLUG: Record<NewsBotGeminiCategorySlug, BotRssCategorySlug | "gundem"> = {
  gundem: "gundem",
  ekonomi: "ekonomi",
  dunya: "dunya",
  spor: "spor",
  teknoloji: "teknoloji",
  magazin: "magazin",
  saglik: "saglik-yasam",
  otomobil: "otomobil",
  "kultur-sanat": "kultur-sanat",
};

/** RSS / Gemini çıktısını veritabanı slug'ına indirger */
export function normalizeNewsBotCategorySlug(
  raw: string | null | undefined,
  fallback: string = "gundem",
): BotRssCategorySlug | "gundem" {
  const normalized = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (!normalized) {
    return normalizeNewsBotCategorySlug(fallback, "gundem");
  }

  if (normalized === "siyaset" || normalized === "politika" || normalized === "siyaset-haberleri") {
    return "gundem";
  }

  if (normalized === "asayis" || normalized === "asayiş") {
    return "gundem";
  }

  if (normalized in GEMINI_TO_DB_SLUG) {
    return GEMINI_TO_DB_SLUG[normalized as NewsBotGeminiCategorySlug];
  }

  if (normalized === "saglik-yasam") {
    return "saglik-yasam";
  }

  const allowedDb: BotRssCategorySlug[] = [
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
  ];

  if ((allowedDb as string[]).includes(normalized)) {
    if (normalized === "siyaset") return "gundem";
    return normalized as BotRssCategorySlug;
  }

  return normalizeNewsBotCategorySlug(fallback, "gundem");
}
