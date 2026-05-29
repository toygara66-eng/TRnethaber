/** RSS öğesi + kaynak sayfası kazıma — fetch-news & news-bot ortak */

import { parseArticleHtml } from "@/lib/bot/article-scraper";
import { extractArticleImagesFromHtml } from "@/lib/bot/scrape-images";

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @deprecated extractArticleImagesFromHtml kullanın */
export function extractArticleImages(html: string, pageUrl?: string): string[] {
  return extractArticleImagesFromHtml(html, pageUrl);
}

export async function scrapeArticlePage(url: string): Promise<{
  imageUrl?: string;
  imageUrls: string[];
  fullText: string;
}> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TRNETHABER-Bot/1.0)" },
      signal: AbortSignal.timeout(12_000),
    });
    const html = await res.text();
    const parsed = parseArticleHtml(html, url);

    return {
      imageUrl: parsed.imageUrl,
      imageUrls: parsed.imageUrls,
      fullText: parsed.fullText,
    };
  } catch (err) {
    console.warn(`[rss-scrape] Kazıma başarısız (${url}):`, err);
    return { imageUrls: [], fullText: "" };
  }
}
