import { applyConstitutionRules } from "@/lib/constitution/text";
import { callGeminiJson, parseJsonObject } from "@/lib/bot/gemini-client";
import {
  GEMINI_NO_BODY_IMAGES_RULE,
  stripArticleContentForPersist,
} from "@/lib/bot/strip-article-content";
import type { ArticleBlock } from "@/lib/bot/seo-article-types";
import { slugifyTitle } from "@/lib/slug";

export const FETCH_NEWS_SYSTEM_PROMPT = `ROL: Sen tarafsız ve profesyonel bir haber editörüsün. Haberi Ters Piramit ve 5N1K (Ne, Kim, Nerede, Ne zaman, Neden, Nasıl) kurallarına göre yaz; en önemli bilgiyi ilk paragrafa koy; akıcı, gazetecilik dili kullan.

ÇIKTI: Yalnızca geçerli JSON (Markdown backtick YOK).

JSON yapısı:
{
  "title": "SEO uyumlu başlık",
  "slug": "seo-uyumlu-slug",
  "keywords": "lsi, anahtar, kelimeler",
  "summary": "Spot metni (en fazla 150 karakter)",
  "is_breaking_news": false,
  "blocks": [
    { "type": "p", "content": "İlk paragraf: 5N1K özeti, en kritik bilgi burada. <strong>Önemli veri</strong> kalın." },
    { "type": "h2", "content": "Olaya özgü, somut alt başlık (jenerik değil)" },
    { "type": "p", "content": "Devam paragrafı..." }
  ]
}

YAZIM VE YAPI:
- İlk "p" bloğu haberin özüdür; ters piramit girişi olmalı.
- Okunabilirlik için metni mutlaka en az 2 adet { "type": "h2" } ile böl.
- H2 alt başlıkları o habere özel, somut ve bilgi taşımalı (ör. "İstanbul'da metro seferlerine ara verildi").
- H2 YASAK örnekleri: "Öne çıkan gelişmeler", "Konuyla ilgili detaylar", "Resmi açıklamalar bekleniyor", "Sonuç ve değerlendirme", "Detaylar", "Gelişmeler" gibi basmakalıp/jenerik ifadeler.
- Paragraflar (p) kısa: en fazla 3 cümle; önemli isim/rakam/yer/tarih <strong> ile vurgulansın.

YAPAY LİSTELEME YASAĞI:
- Metne zorla madde imi, tireli liste veya { "type": "ul" } EKLEME.
- Yalnızca ham metin doğası gereği kesin bir liste gerektiriyorsa ul kullan (ör. resmi ölü/yaralı sayıları, maddeler halinde alınan karar, sıralı suçlama maddeleri).
- Şüphede paragraf (p) akışını koru; ul kullanma.

SON DAKİKA (is_breaking_news):
- true: ölüm, yaralanma, kaza, deprem, patlama, yangın, terör, suikast, göçmen faciası, acil ekonomik karar, hükümet istifası, sıcak çatışma, flaş/son dakika ifadeleri vb.
- false: rutin, analiz, planlı açıklama, kritik olmayan spor sonucu.
- Şüphede false.

DİĞER:
- Rakamları kelimeyle yaz; yüzde sembolü kullanma.
- Bilgi uydurma; yalnızca verilen ham metin.
- slug: Türkçe, küçük harf, tireli.

HAM METİN TEMİZLİĞİ:
- Sana verilen metnin içindeki menü yazıları, yorum uyarısı, çerez politikası ve benzeri alakasız web sitesi arayüz metinlerini tamamen görmezden gel.
- Yalnızca haberin ana konusuna odaklanarak yeni bir metin yaz.

${GEMINI_NO_BODY_IMAGES_RULE}`;

export type FetchNewsGeminiJson = {
  title: string;
  slug: string;
  keywords: string[];
  summary: string;
  is_breaking_news: boolean;
  blocks: ArticleBlock[];
};

function parseBreakingFlag(raw: unknown): boolean {
  if (raw === true || raw === "true" || raw === 1 || raw === "1") return true;
  if (raw === false || raw === "false" || raw === 0 || raw === "0") return false;
  return false;
}

function blockText(row: Record<string, unknown>): string {
  let raw = "";
  if (typeof row.text === "string") raw = row.text.trim();
  else if (typeof row.content === "string") raw = row.content.trim();
  return stripArticleContentForPersist(applyConstitutionRules(raw));
}

function parseFetchBlock(raw: unknown): ArticleBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const type = row.type;
  const text = blockText(row);

  if (type === "h2" && text) return { type: "h2", text };
  if (type === "p" && text) return { type: "p", text };

  if (type === "ul" && Array.isArray(row.items)) {
    const items = row.items
      .filter((i): i is string => typeof i === "string" && i.trim().length > 0)
      .map((i) => stripArticleContentForPersist(applyConstitutionRules(i.trim())))
      .slice(0, 8);
    if (items.length > 0) return { type: "ul", items };
  }

  return null;
}

function parseKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
      .map((k) => applyConstitutionRules(k.trim()))
      .slice(0, 7);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,;|]/)
      .map((k) => applyConstitutionRules(k.trim()))
      .filter(Boolean)
      .slice(0, 7);
  }
  return [];
}

export function parseFetchNewsGeminiJson(
  raw: string,
  fallbackTitle: string,
): FetchNewsGeminiJson {
  const obj = parseJsonObject<Record<string, unknown>>(raw);

  const title = applyConstitutionRules(
    typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : fallbackTitle,
  );

  const slugRaw =
    typeof obj.slug === "string" && obj.slug.trim()
      ? obj.slug.trim()
      : slugifyTitle(title);
  const slug = slugifyTitle(slugRaw) || slugifyTitle(title);

  const keywords = parseKeywords(obj.keywords);
  const summary = applyConstitutionRules(
    typeof obj.summary === "string" ? obj.summary.trim().slice(0, 150) : title.slice(0, 150),
  );

  const blocks: ArticleBlock[] = [];
  if (Array.isArray(obj.blocks)) {
    for (const item of obj.blocks) {
      const block = parseFetchBlock(item);
      if (block) blocks.push(block);
    }
  }

  if (blocks.length === 0) {
    throw new Error("Gemini blocks boş");
  }

  const h2Count = blocks.filter((b) => b.type === "h2").length;
  if (h2Count < 2) {
    throw new Error(`En az 2 H2 gerekli (gelen: ${h2Count})`);
  }

  const is_breaking_news = parseBreakingFlag(obj.is_breaking_news);

  return { title, slug, keywords, summary, is_breaking_news, blocks };
}

export async function generateFetchNewsJson(
  userPrompt: string,
  fallbackTitle: string,
): Promise<FetchNewsGeminiJson> {
  const raw = await callGeminiJson(FETCH_NEWS_SYSTEM_PROMPT, userPrompt, 0.4);
  return parseFetchNewsGeminiJson(raw, fallbackTitle);
}
