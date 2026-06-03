import {
  callGeminiJson,
  GEMINI_STRICT_JSON_RULE,
  parseJsonObject,
} from "@/lib/bot/gemini-client";
import { prepareArticleHtml } from "@/lib/articles/sanitize-dom";
import type { City } from "@/lib/data/cities";

export const SEYAHAT_CATEGORY_SLUG = "seyahat";

function preserveGuideText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** İl adına göre dinamik system prompt */
export function buildSehirRehberiSystemPrompt(cityName: string): string {
  return `Sen Türkiye'yi karış karış gezmiş gurme bir gezgin ve usta bir SEO uzmanısın. Senden '${cityName}' şehri için, okuyan herkesi oraya gitmeye ikna edecek, muazzam detaylı bir ansiklopedik şehir rehberi yazmanı istiyorum.

${GEMINI_STRICT_JSON_RULE}

Dönüş formatın KESİNLİKLE şu JSON olmalı:
{ "title": "${cityName} Gezi Rehberi: Gezilecek Yerler, Meşhur Yemekler ve 1 Günlük Rota", "summary": "${cityName} hakkında okuyucuyu heyecanlandıracak, şiirsel ve vurucu 2 cümlelik özet.", "content": "HTML formatında çok zengin içerik" }

'content' (İÇERİK) İÇİN GELİŞMİŞ HTML KURALLARI:
İçeriği sıradan paragraflar yerine şu profesyonel HTML yapısıyla inşa et:

- HIZLI BAKIŞ TABLOSU: Yazının en başına HTML <table> etiketiyle şık bir tablo ekle. Tabloda ilin: Bölgesi, Plaka Kodu, Nüfusu ve Meşhur Simgesi yer alsın.
- <h2>${cityName} Hakkında Gizli Kalmış Bilgiler</h2> (Şehrin tarihi veya ilginç bir efsanesi)
- <h2>${cityName}'da Kesinlikle Görmeniz Gereken 5 Yer</h2> (Her yeri <h3> başlığıyla ayır ve altlarına <ul><li> bullet point'lerle neden görülmesi gerektiğini yaz).
- <h2>${cityName} Mutfağı: Nerede Ne Yenir?</h2> (Sadece yemek adı değil, o yemeğin içeriğini de anlat).
- <h2>Hızlı Tur: 1 Günlük ${cityName} Rotası</h2> (Sabah, Öğle, Akşam olarak HTML listesi şeklinde bir rota planla).
- <h2>Sıkça Sorulan Sorular (S.S.S)</h2> (Bu şehre ne zaman gidilir? Ulaşım nasıldır? gibi 3 soru ve cevabını ekle).

İMLA VE DİL KURALLARI (ÇOK KRİTİK):
- Özel isimlere gelen ekleri ASLA boşluk bırakarak ayırma. Mutlaka kesme işareti (') kullan. (Örn: Yozgat'ın, İstanbul'da).
- Rakamları kelimeyle yaz (15 bin; 15.000 veya 15.000 değil).
- Yüzdeleri metinle yaz (yüzde 35; yüzde işareti kullanma).
- Sıra sayılarında nokta kullanma; kesme işaretiyle yaz (1'inci, 1. değil).
- Metin içinde önemli yer isimlerini <strong> ile kalın yap.
- Asla var olmayan uydurma mekanlar veya yemekler yazma.

GÖRSEL YASAĞI (ZORUNLU):
- Makale için resim linki, görsel URL'si, kapak fotoğrafı veya featured_image alanı ÜRETME.
- Yalnızca title, summary ve content (HTML) döndür; görseller sistem tarafından Wikipedia'dan eklenecek.`;
}

export function buildSehirRehberiUserPrompt(city: City): string {
  return [
    `Şehir: ${city.name} (slug: ${city.slug})`,
    "Türkiye şehir gezi rehberi JSON üret.",
    "Tablodaki nüfus ve plaka bilgilerini güvenilir genel bilgilerle yaz; emin değilsen yaklaşık ifade kullan.",
    GEMINI_STRICT_JSON_RULE,
  ].join("\n");
}

export type SehirRehberiGeminiJson = {
  title: string;
  summary: string;
  content: string;
};

export type SehirRehberiDraft = SehirRehberiGeminiJson & {
  contentHtml: string;
  metaDescription: string;
  seoKeywords: string;
  slug: string;
  /** İşlenen il adı — kapak görseli (Wikipedia) için */
  cityName: string;
};

function guideMetaDescription(summary: string, title: string, maxChars = 160): string {
  const trimmed = (summary.trim() || title.trim()).replace(/\s+/g, " ");
  if (trimmed.length <= maxChars) return trimmed;
  const slice = trimmed.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.55) return slice.slice(0, lastSpace).trim();
  return slice.trim();
}

export function parseSehirRehberiJson(
  raw: string,
  city: City,
): SehirRehberiGeminiJson | null {
  const obj = parseJsonObject<Record<string, unknown>>(raw);

  const title =
    preserveGuideText(String(obj.title ?? "")) ||
    `${city.name} Gezi Rehberi: Gezilecek Yerler, Meşhur Yemekler ve 1 Günlük Rota`;
  const summary = preserveGuideText(String(obj.summary ?? ""));
  const content = String(obj.content ?? "").trim();

  if (!summary || !content) return null;

  return { title, summary, content };
}

export function finalizeSehirRehberiDraft(
  parsed: SehirRehberiGeminiJson,
  city: City,
): SehirRehberiDraft {
  const contentHtml = prepareArticleHtml(parsed.content);
  const slug = `${city.slug}-gezi-rehberi`;
  const seoKeywords = [
    `${city.name} gezi rehberi`,
    `${city.name} gezilecek yerler`,
    `${city.name} yemekleri`,
    `${city.name} 1 günlük rota`,
    "seyahat",
    "türkiye gezi",
  ].join(", ");

  return {
    ...parsed,
    contentHtml,
    slug,
    cityName: city.name.trim(),
    metaDescription: guideMetaDescription(parsed.summary, parsed.title),
    seoKeywords,
  };
}

export async function generateSehirRehberiWithGemini(
  city: City,
): Promise<SehirRehberiDraft | null> {
  const raw = await callGeminiJson(
    buildSehirRehberiSystemPrompt(city.name),
    buildSehirRehberiUserPrompt(city),
    0.35,
    { liteAugment: true, maxOutputTokens: 800 },
  );
  const parsed = parseSehirRehberiJson(raw, city);
  if (!parsed) return null;
  return finalizeSehirRehberiDraft(parsed, city);
}
