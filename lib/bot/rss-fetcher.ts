import Parser from "rss-parser";
import { assertNotDuplicateArticle } from "@/lib/bot/duplicate-check";
import {
  pickRandomCategory,
  pickRandomFeedUrl,
  type RssCategoryKey,
} from "@/lib/bot/rss-feed-pool";
import { slugifyTitle } from "@/lib/slug";
import type { AgencyWire } from "@/lib/bot/types";

type RssItem = {
  title?: string;
  link?: string;
  guid?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
};

const parser = new Parser<RssItem, Record<string, unknown>>({
  timeout: 20000,
  headers: {
    "User-Agent": "TRNETHABER-Bot/1.0 (+https://trnethaber.vercel.app)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

export type RssPickMeta = {
  category: RssCategoryKey;
  feedUrl: string;
  feedTitle: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferBreaking(title: string): boolean {
  return /son dakika|flaş|flash|acil|kritik|breaking/i.test(title);
}

// YENİ: Sitenin içine girip tüm metni ve orijinal fotoğrafı çeken "Kazıyıcı" fonksiyon
async function scrapeFullArticle(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000) // 10 saniyede açılmazsa pes et
    });
    const html = await res.text();

    // 1. Kapak Fotoğrafını (og:image) bul
    const ogImageMatch = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
    const imageUrl = ogImageMatch ? ogImageMatch[1] : undefined;

    // 2. Haber metnini (Paragrafları) bul
    const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gis);
    let fullText = "";
    if (pMatches) {
      fullText = pMatches
        .map(p => stripHtml(p))
        .filter(p => p.length > 50) // Çok kısa (reklam/menü) satırları çöpe at
        .join("\n\n");
    }

    return { imageUrl, fullText };
  } catch (err) {
    console.warn(`[news-bot] Haber kazınamadı (${url}), RSS özetine dönülüyor.`);
    return { imageUrl: undefined, fullText: "" };
  }
}

// GÜNCELLENDİ: Artık asenkron çalışıyor ve içine kazıyıcı entegre edildi
async function wireFromRssItem(
  item: RssItem,
  category: RssCategoryKey,
  feedTitle: string,
): Promise<AgencyWire> {
  const rawTitle = (item.title ?? "Başlıksız haber").trim();
  const link = item.link?.trim() || "";

  // Haberin içine gir ve verileri kazı (SİHİR BURADA GERÇEKLEŞİYOR)
  const scraped = link ? await scrapeFullArticle(link) : { imageUrl: undefined, fullText: "" };

  const summary = item.contentSnippet?.trim() || stripHtml(item.content ?? "") || stripHtml(item.summary ?? "") || rawTitle;

  // Eğer kazınan metin yeterince uzunsa (100 karakterden fazlaysa) o uzun metni kullan, yoksa RSS özetini kullan
  const rawBody = scraped.fullText.length > 100
    ? scraped.fullText
    : `${summary}\n\nKaynak: ${feedTitle}. Detaylar orijinal bağlantıda.`;

  const rawLead = rawBody.slice(0, 320);

  return {
    id: item.guid ?? link ?? slugifyTitle(rawTitle),
    categorySlug: category,
    isBreaking: inferBreaking(rawTitle),
    rawTitle,
    rawLead,
    rawBody,
    sourceLabel: feedTitle || "RSS Ajans",
    sourceUrl: link,
    imageUrl: scraped.imageUrl, // Yakalanan orijinal görseli sisteme iletiyoruz
  } as AgencyWire & { imageUrl?: string }; // Typescript hata vermesin diye ufak bir hile
}

export async function fetchRandomRssWire(maxAttempts = 3): Promise<{
  wire: AgencyWire & { imageUrl?: string };
  meta: RssPickMeta;
}> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const category = pickRandomCategory();
    const feedUrl = pickRandomFeedUrl(category);

    try {
      const feed = await parser.parseURL(feedUrl);
      const latest = feed.items?.[0];

      if (!latest?.title?.trim()) {
        throw new Error(`RSS akışında haber yok: ${feedUrl}`);
      }

      // GÜNCELLENDİ: wireFromRssItem artık asenkron olduğu için "await" eklendi
      const wire = await wireFromRssItem(latest, category, feed.title ?? category);
      const meta: RssPickMeta = {
        category,
        feedUrl,
        feedTitle: feed.title ?? category,
      };

      await assertNotDuplicateArticle(wire, meta);

      return { wire, meta };