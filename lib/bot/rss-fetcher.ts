import Parser from "rss-parser";
import {
  assertNotDuplicateArticle,
  DUPLICATE_SLUG_SKIP_MESSAGE,
  DUPLICATE_TITLE_SKIP_MESSAGE,
  DUPLICATE_URL_SKIP_MESSAGE,
  DuplicateArticleError,
} from "@/lib/bot/duplicate-check";
import { cleanRssSourceUrl } from "@/lib/bot/source-url";
import {
  pickRandomFeedUrl,
  pickWeightedNewsCategory,
  type RssCategoryKey,
} from "@/lib/bot/rss-feed-pool";
import { extractArticleImages, scrapeArticlePage, stripHtml } from "@/lib/bot/rss-scrape";
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

import type { NewsFocusTier } from "@/lib/bot/turkey-news-focus";

export type RssPickMeta = {
  category: RssCategoryKey;
  feedUrl: string;
  feedTitle: string;
  focusTier: NewsFocusTier;
};

function inferBreaking(title: string): boolean {
  return /son dakika|flaş|flash|acil|kritik|breaking/i.test(title);
}

async function scrapeFullArticle(url: string) {
  const scraped = await scrapeArticlePage(url);
  return {
    imageUrl: scraped.imageUrls[0],
    imageUrls: scraped.imageUrls,
    fullText: scraped.fullText,
  };
}

async function wireFromRssItem(
  item: RssItem,
  category: RssCategoryKey,
  feedTitle: string,
  canonicalUrl?: string,
): Promise<AgencyWire> {
  const rawTitle = (item.title ?? "Başlıksız haber").trim();
  const link = item.link?.trim() || "";
  const cleanUrl = canonicalUrl ?? cleanRssSourceUrl(link);

  const scraped = link
    ? await scrapeFullArticle(link)
    : { imageUrl: undefined, imageUrls: [] as string[], fullText: "" };

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
    sourceUrl: cleanUrl,
    imageUrl: scraped.imageUrl,
    imageUrls: scraped.imageUrls,
  };
}

export async function fetchRandomRssWire(maxAttempts = 2): Promise<{
  wire: AgencyWire;
  meta: RssPickMeta;
}> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { category, tier } = pickWeightedNewsCategory();
    const feedUrl = pickRandomFeedUrl(category);

    try {
      const feed = await parser.parseURL(feedUrl);
      const latest = feed.items?.[0];

      if (!latest?.title?.trim()) {
        throw new Error(`RSS akışında haber yok: ${feedUrl}`);
      }

      const rawLink = latest.link?.trim() || "";
      const cleanUrl = cleanRssSourceUrl(rawLink);

      const meta: RssPickMeta = {
        category,
        feedUrl,
        feedTitle: feed.title ?? category,
        focusTier: tier,
      };

      const wire = await wireFromRssItem(
        latest,
        category,
        feed.title ?? category,
        cleanUrl || undefined,
      );

      await assertNotDuplicateArticle(wire, meta);

      return { wire, meta };
    } catch (error: unknown) {
      if (error instanceof DuplicateArticleError) {
        if (error.reason === "url" || error.reason === "title" || error.reason === "slug") {
          const msg =
            error.reason === "url"
              ? DUPLICATE_URL_SKIP_MESSAGE
              : error.reason === "slug"
                ? DUPLICATE_SLUG_SKIP_MESSAGE
                : DUPLICATE_TITLE_SKIP_MESSAGE;
          console.info(`[news-bot] ${msg} — sonraki RSS deneniyor`);
          lastError = error;
          continue;
        }
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[news-bot] RSS çekme hatası (Deneme ${attempt}/${maxAttempts}): ${feedUrl} | Hata: ${message}`,
      );
      lastError = error;
    }
  }

  throw new Error(`RSS çekilemedi, ${maxAttempts} deneme başarısız: ${lastError?.message}`);
}