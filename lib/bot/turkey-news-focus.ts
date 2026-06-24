import type { BotRssCategorySlug } from "@/lib/data/core-categories";

/** Ulusal gündem kotası — RSS çekiminde %80 */
export const NATIONAL_NEWS_QUOTA_RATIO = 0.8;

/** Uluslararası (dünya) kotası — RSS çekiminde %20 */
export const INTERNATIONAL_NEWS_QUOTA_RATIO = 1 - NATIONAL_NEWS_QUOTA_RATIO;

/** Türkiye merkezli ulusal RSS kategorileri */
export const NATIONAL_RSS_CATEGORIES: readonly BotRssCategorySlug[] = [
  "gundem",
  "ekonomi",
  "siyaset",
  "spor",
  "teknoloji",
  "magazin",
  "saglik-yasam",
  "otomobil",
  "kultur-sanat",
] as const;

/** Uluslararası haber kotası — yalnızca dünya */
export const INTERNATIONAL_RSS_CATEGORIES: readonly BotRssCategorySlug[] = ["dunya"] as const;

export type NewsFocusTier = "national" | "international";

/**
 * Harici haber API'leri (NewsAPI, GNews, SerpApi vb.) eklendiğinde
 * istek URL'sine zorunlu parametreler: country=tr ve language=tr
 */
export const EXTERNAL_NEWS_API_TR_PARAMS = {
  country: "tr",
  language: "tr",
} as const;

export function buildExternalNewsApiQuerySuffix(): string {
  return `country=${EXTERNAL_NEWS_API_TR_PARAMS.country}&language=${EXTERNAL_NEWS_API_TR_PARAMS.language}`;
}

/** %80 ulusal / %20 uluslararası ağırlıklı kategori seçimi */
export function pickWeightedNewsCategory(): { category: BotRssCategorySlug; tier: NewsFocusTier } {
  const tier: NewsFocusTier =
    Math.random() < NATIONAL_NEWS_QUOTA_RATIO ? "national" : "international";

  const pool = tier === "national" ? NATIONAL_RSS_CATEGORIES : INTERNATIONAL_RSS_CATEGORIES;
  const index = Math.floor(Math.random() * pool.length);
  return { category: pool[index], tier };
}

/** Yazar botu ve SEO motoru için zorunlu editoryal master protokol */
export const TRNETHABER_MASTER_PROTOCOL = `TRNETHABER MASTER PROTOKOL (KESİN KURALLAR):
- Başlık tipografisi: Tüm başlıklar (title ve h2 alt başlıklar) KESİNLİKLE cümle düzeni (sentence case) formatında olacaktır. Yalnızca cümlenin ilk harfi ve özel isimler büyük harfle başlar; gereksiz Title Case kullanma.
- Sayı ve yüzde formatı: Metin içindeki sayılar sembol yerine kelimeyle yazılır. Binlik rakamlar "2.500" değil "2 bin 500"; yüzdeler "%35" değil "yüzde 35" biçiminde olmalıdır.
- TDK ve SEO: Metin kusursuz TDK dil bilgisi kurallarına uyacak; kısa paragraflar, net alt başlıklar ve anahtar kelime yerleşimiyle en az 90+ SEO skoruna uygun yapılandırılacaktır.
- Halüsinasyon koruması: Orijinal ham metinde yer almayan hiçbir "uzman görüşü", "sahte yorum" veya doğrulanmamış dış bilgi eklenmeyecektir. Yalnızca verilen ham veriye sadık kal.
- Türkiye perspektifi: Sen Türkiye merkezli TRNETHABER'in baş editörüsün. Haberleri yalnızca Türkiye'deki okuyucunun ilgisini çekecek, ulusal bir bakış açısıyla yaz. Yabancı kaynaklı veya global bir olay gelse bile bunu Türkiye'yi veya Türk insanını nasıl etkilediği ekseninde yerelleştirerek sun.`;
