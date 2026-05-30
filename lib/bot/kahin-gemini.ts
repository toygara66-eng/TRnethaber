import {
  callGeminiJson,
  GEMINI_STRICT_JSON_RULE,
  parseJsonObject,
} from "@/lib/bot/gemini-client";
import { prepareArticleHtml } from "@/lib/articles/sanitize-dom";

export const KIMDIR_CATEGORY_SLUG = "kimdir";

/** Kahin — Gemini system prompt (kimdir-bot) */
export const KAHIN_SYSTEM_PROMPT = `Sen TRNETHABER Kahin editörüsün. Google Türkiye trend arama kelimelerinden yalnızca gerçek kişi isimleri için kimdir biyografisi üretirsin.

${GEMINI_STRICT_JSON_RULE}

Kişi değilse (takım, kurum, dizi, olay, ürün vb.) yalnızca şunu dön: { "isPerson": false }

Kişi ise dönüş formatın KESİNLİKLE şu JSON olmalı:
{ "isPerson": true, "personName": "Sadece Adı Soyadı", "title": "[personName] Kimdir, Nereli, Neden Gündemde? İşte Hayatı", "summary": "Kısa ve çok vurucu 2 cümlelik özet", "content": "HTML formatında detaylı biyografi" }

'content' (İÇERİK) KISMI İÇİN KESİN KURALLAR:
- İçeriği düz metin yazma, mutlaka şu <h2> alt başlıklarına böl: <h2>[Kişi Adı] Kimdir?</h2>, <h2>Nereli ve Kaç Yaşında?</h2>, <h2>Eğitim ve Kariyer Hayatı</h2>, <h2>[Kişi Adı] Neden Gündemde?</h2>
- DÜRÜST GAZETECİLİK: Eğer kişi hakkında bir alt başlığın (örn: yaşı, nereli olduğu veya eğitimi) cevabı internette YOKSA, alt başlığı kesinlikle silme ve asla bilgi uydurma (halüsinasyon yasak). O başlığın altına profesyonel bir dille şunu yaz: '[Kişi Adı]'nın nereli olduğu ve tam doğum tarihi hakkında şu an için basına veya açık kaynaklara yansıyan net bir bilgi bulunmamaktadır. Konuyla ilgili yeni detaylar ortaya çıktıkça haberimiz güncellenecektir.'
- İMLA (ÇOK KRİTİK): Özel isimlere gelen ekleri ASLA boşluk bırakarak ayırma. Mutlaka kesme işareti (') kullan. (Örn: Ankara'dan).
- OKUNABİLİRLİK: Önemli kişi, kurum ve yer isimlerini HTML içinde <strong> etiketi ile kalın yap.`;

export type KahinGeminiJson = {
  isPerson: boolean;
  personName?: string;
  title?: string;
  summary?: string;
  content?: string;
};

export type KahinPersonDraft = {
  personName: string;
  title: string;
  summary: string;
  contentHtml: string;
  metaDescription: string;
  seoKeywords: string;
};

/** Kesme işaretleri ve imla korunur — constitution/slugify UYGULANMAZ */
function preserveKahinText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function buildKahinUserPrompt(keyword: string): string {
  return `Sana şu an Google Türkiye'de aniden trend olan bir arama kelimesi veriyorum: '${keyword}'.
Önce düşün: Bu kelime yaşayan veya tarihi KESİN bir insan/kişi ismi mi? (Eğer bir takım, kurum, dizi veya olaysa { "isPerson": false } dön ve işlemi bitir).
EĞER bu bir kişi ismiyse, demek ki şu an Türkiye'de bu kişi aniden merak ediliyor. Onun hakkında SEO uyumlu, çok detaylı bir biyografi yaz.

${GEMINI_STRICT_JSON_RULE}`;
}

function parseKahinJson(raw: string, keyword: string): KahinGeminiJson {
  const obj = parseJsonObject<Record<string, unknown>>(raw);
  const isPerson =
    obj.isPerson === true ||
    obj.isPerson === "true" ||
    obj.isPerson === 1 ||
    obj.isPerson === "1";

  if (!isPerson) {
    return { isPerson: false };
  }

  return {
    isPerson: true,
    personName: String(obj.personName ?? keyword).trim(),
    title: String(obj.title ?? "").trim(),
    summary: String(obj.summary ?? "").trim(),
    content: String(obj.content ?? "").trim(),
  };
}

export function finalizeKahinPerson(
  parsed: KahinGeminiJson,
  trendKeyword: string,
): KahinPersonDraft | null {
  if (!parsed.isPerson) return null;

  const personName = preserveKahinText(parsed.personName ?? trendKeyword);
  if (!personName) return null;

  const title =
    preserveKahinText(parsed.title ?? "") ||
    `${personName} Kimdir, Nereli, Neden Gündemde? İşte Hayatı`;
  const summary = preserveKahinText(parsed.summary ?? "");
  const contentHtml = prepareArticleHtml(parsed.content ?? "");

  if (!summary || !contentHtml) return null;

  const metaDescription = kahinMetaDescription(summary, title);
  const seoKeywords = `${personName}, ${personName} kimdir, kimdir, nereli, gündem`;

  return {
    personName,
    title,
    summary,
    contentHtml,
    metaDescription,
    seoKeywords,
  };
}

/** Meta açıklama — constitution/sanitize yok; kesme işareti korunur */
function kahinMetaDescription(summary: string, title: string, maxChars = 155): string {
  const trimmed = (summary.trim() || title.trim()).replace(/\s+/g, " ");
  if (trimmed.length <= maxChars) return trimmed;

  const slice = trimmed.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.55) {
    return slice.slice(0, lastSpace).trim();
  }
  return slice.trim();
}

export async function analyzeTrendKeywordWithGemini(
  keyword: string,
): Promise<KahinGeminiJson> {
  const raw = await callGeminiJson(KAHIN_SYSTEM_PROMPT, buildKahinUserPrompt(keyword), 0.2);
  return parseKahinJson(raw, keyword);
}
