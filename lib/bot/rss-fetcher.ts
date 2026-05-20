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

async function scrapeFullArticle(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000)
    });
    const html = await res.text();

    const ogImageMatch = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
    const imageUrl = ogImageMatch ? ogImageMatch[1] : undefined;

    const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gis);
    let fullText = "";
    if (pMatches) {
      fullText = pMatches
        .map(p => stripHtml(p))
        .filter(p => p.length > 50)
        .join("\n\n");
    }

    return { imageUrl, fullText };
  } catch (err) {
    console.warn(`[news-bot] Haber kazınamadı (${url}), RSS özetine dönülüyor.`);
    return { imageUrl: undefined, fullText: "" };
  }
}

async function wireFromRssItem(
  item: RssItem,
  category: RssCategoryKey,
  feedTitle: string,
): Promise<AgencyWire> {
  const rawTitle = (item.title ?? "Başlıksız haber").trim();
  const link = item.link?.trim() || "";

  const scraped = link ? await scrapeFullArticle(link) : { imageUrl: undefined, fullText: "" };

  const summary = item.contentSnippet?.trim() || stripHtml(item.content ?? "") || stripHtml(item.summary ?? "") || rawTitle;

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
    imageUrl: scraped.imageUrl,
  } as AgencyWire & { imageUrl?: string };
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

      const wire = await wireFromRssItem(latest, category, feed.title ?? category);
      const meta: RssPickMeta = {
        category,
        feedUrl,
        feedTitle: feed.title ?? category,
      };

      await assertNotDuplicateArticle(wire, meta);

      return { wire, meta };
    } catch (error: any) {
      if (error?.name === "DuplicateArticleError") {
        throw error;
      }
      console.warn(`[news-bot] RSS çekme hatası (Deneme ${attempt}/${maxAttempts}): ${feedUrl} | Hata: ${error.message}`);
      lastError = error;
    }
  }

  throw new Error(`RSS çekilemedi, ${maxAttempts} deneme başarısız: ${lastError?.message}`);
}