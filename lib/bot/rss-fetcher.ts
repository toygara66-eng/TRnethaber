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

function wireFromRssItem(
  item: RssItem,
  category: RssCategoryKey,
  feedTitle: string,
): AgencyWire {
  const rawTitle = (item.title ?? "Başlıksız haber").trim();
  const summary =
    item.contentSnippet?.trim() ||
    stripHtml(item.content ?? "") ||
    stripHtml(item.summary ?? "") ||
    rawTitle;
  const rawLead = summary.slice(0, 320);
  const rawBody =
    summary.length > 320
      ? summary
      : `${summary}\n\nKaynak: ${feedTitle}. Detaylar orijinal bağlantıda.`;

  return {
    id: item.guid ?? item.link ?? slugifyTitle(rawTitle),
    categorySlug: category,
    isBreaking: inferBreaking(rawTitle),
    rawTitle,
    rawLead,
    rawBody,
    sourceLabel: feedTitle || "RSS Ajans",
    sourceUrl: item.link?.trim(),
  };
}

/**
 * Rastgele kategori + rastgele feed → en yeni (ilk) haber.
 * Duplicate ise işlem iptal (throw DuplicateArticleError).
 */
export async function fetchRandomRssWire(): Promise<{
  wire: AgencyWire;
  meta: RssPickMeta;
}> {
  const category = pickRandomCategory();
  const feedUrl = pickRandomFeedUrl(category);

  const feed = await parser.parseURL(feedUrl);
  const latest = feed.items?.[0];

  if (!latest?.title?.trim()) {
    throw new Error(`RSS akışında haber yok: ${feedUrl}`);
  }

  const wire = wireFromRssItem(latest, category, feed.title ?? category);
  const meta: RssPickMeta = {
    category,
    feedUrl,
    feedTitle: feed.title ?? category,
  };

  await assertNotDuplicateArticle(wire, meta);

  return { wire, meta };
}
