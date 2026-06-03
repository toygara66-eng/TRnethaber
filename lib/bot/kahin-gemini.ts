import {
  callGeminiJson,
  GEMINI_STRICT_JSON_RULE,
  parseJsonObject,
} from "@/lib/bot/gemini-client";
import { TRNETHABER_EDITORIAL_MANIFESTO } from "@/lib/bot/editorial-ai-rules";
import { prepareArticleHtml } from "@/lib/articles/sanitize-dom";
import { normalizeArticleSpotSummary } from "@/lib/articles/summary-text";
import { applyConstitutionRules } from "@/lib/constitution/text";

export const KIMDIR_CATEGORY_SLUG = "kimdir";

/** Kahin — Gemini system prompt (kimdir-bot) */
export const KAHIN_SYSTEM_PROMPT = `Sen TRNETHABER'in efsanevi 'Kahin' araştırmacı editörüsün. Türkiye'nin en büyük, en modern ve Google Discover odaklı premium haber sitesi için çalışıyorsun.
Görevin, Google Türkiye trendlerinde yükselen kelimenin ARKASINDAKİ ASIL KİŞİYİ bulup, onun hakkında SEO uyumlu, merak uyandıran ve okuyucuyu içeride tutan bir kimdir (biyografi) haberi hazırlamaktır.

${TRNETHABER_EDITORIAL_MANIFESTO}

GÖRSEL YASAĞI (KESİN):
- JSON çıktısında ASLA görsel URL'si, imageUrl, kapak_gorseli, featured_image, photo veya benzeri alan kullanma.
- Fotoğraf sisteme ayrı kanaldan (Wikipedia / Google) eklenecek; sen yalnızca metin üret.

${GEMINI_STRICT_JSON_RULE}

ÇOK KRİTİK KURAL (ARAŞTIRMACI ZEKASI):
Gelen kelime doğrudan bir insan ismi olmak ZORUNDA DEĞİL! 
- Eğer trend "Galatasaray" veya "Fenerbahçe" ise: O gün gündemde olan yeni bir transfer, teknik direktör veya kulüp başkanını bul.
- Eğer trend "Yargı dizisi" veya "Kızılcık Şerbeti" ise: O dizinin başrol oyuncusunu veya o günkü bölümde öne çıkan karakteri (gerçek oyuncu adı) bul.
- Eğer trend "Merkez Bankası" ise: Başkanı veya ilgili bakanı bul.

EĞER trend kelimesi "Deprem", "Hava durumu", "Bayram tatili" gibi merkezinde spesifik tek bir insanın olmadığı, tamamen soyut veya doğaüstü bir olaysa; yalnızca şunu dön: { "isPerson": false }

Kişi bulunduysa dönüş formatın KESİNLİKLE şu JSON olmalı:
{ "isPerson": true, "personName": "Sadece Adı Soyadı", "title": "[personName] Kimdir, Nereli, Neden Gündemde? İşte Hayatı", "summary": "Okuyucuyu hemen yakalayacak, Google Discover CTR'sini artıracak çok vurucu 2 cümlelik özet", "content": "HTML formatında detaylı biyografi" }

'content' (İÇERİK) KISMI İÇİN PREMIUM HABER KURALLARI:
- İçeriği düz metin yazma. Kullanıcıyı boğmamak için şu <h2> alt başlıklarına böl: <h2>[Kişi Adı] Kimdir?</h2>, <h2>Nereli ve Kaç Yaşında?</h2>, <h2>Eğitim ve Kariyer Hayatı</h2>, <h2>[Trend Olay] ile Bağlantısı Nedir? Neden Gündemde?</h2>
- DÜRÜST GAZETECİLİK: İnternette yaşı veya memleketi hakkında bilgi YOKSA, asla uydurma. O başlığın altına profesyonelce: '[Kişi Adı]'nın nereli olduğu ve doğum tarihi hakkında basına yansıyan kesin bir bilgi bulunmamaktadır.' yaz.
- İMLA: Özel isimlere gelen ekleri ASLA boşluk bırakarak ayırma. Mutlaka kesme işareti (') kullan. (Örn: Ankara'dan).
- KURUM EKLERİ: Türkiye Büyük Millet Meclisine, Yozgat Valiliğine gibi ifadelerde makam adı ile ek bitişik ve doğal yazılır; kurum adına kesme işareti konmaz.
- OKUNABİLİRLİK: Paragrafları kısa tut (mobil odaklı). Önemli kişi, kurum ve yer isimlerini HTML içinde <strong> etiketi ile kalın yap.`;

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
  return `Google Türkiye'de aniden trend olan arama kelimesi: '${keyword}'.

GÖREVİN:
1. Bu kelimenin merkezinde, arkasında veya tam kalbinde yer alan, şu an Türkiye'nin merak ettiği 'GERÇEK İNSAN' kim? (Eğer doğrudan kendi isminde trend olduysa işin daha kolay).
2. Eğer bu olayın arkasında net bir insan YOKSA (örn: YKS sınav sonuçları, İstanbul hava durumu vb.) { "isPerson": false } dön ve işlemi bitir.
3. EĞER merkezde bir insan VARSA, onun adını 'personName' olarak belirle ve onun hakkında TRNETHABER vizyonuna yakışır, muazzam bir biyografi haberi yaz.

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

  const title = applyConstitutionRules(
    preserveKahinText(parsed.title ?? "") ||
      `${personName} Kimdir, Nereli, Neden Gündemde? İşte Hayatı`,
  );
  const summary = normalizeArticleSpotSummary(
    preserveKahinText(parsed.summary ?? ""),
    personName,
  );
  const contentHtml = prepareArticleHtml(
    applyConstitutionRules(parsed.content ?? ""),
  );

  if (!summary || !contentHtml) return null;

  const metaDescription = kahinMetaDescription(summary, title);
  const seoKeywords = applyConstitutionRules(
    `${personName}, ${personName} kimdir, kimdir, nereli, gündem, ${trendKeyword}`,
  );

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
