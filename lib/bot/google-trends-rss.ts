import Parser from "rss-parser";

/**
 * Kahin kaynağı — Türkiye günlük/anlık arama trendleri (anahtar kelime RSS).
 * Not: Google bazen daily endpoint'te 404 döner; üretimde yedek feed devreye girer.
 */
export const GOOGLE_TRENDS_TR_RSS_URL =
  "https://trends.google.com/trends/trendingsearches/daily/rss?geo=TR";

/** Birincil URL 404 olduğunda — aynı geo=TR trend anahtar kelimeleri */
const GOOGLE_TRENDS_TR_RSS_FALLBACK =
  "https://trends.google.com/trending/rss?geo=TR";

type TrendsRssItem = {
  title?: string;
};

const parser = new Parser<TrendsRssItem, Record<string, unknown>>({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; TRNETHABER-KimdirBot/1.0; +https://trnethaber.com)",
    Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
  },
});

/** RSS title = insanların arattığı anahtar kelime (haber başlığı değil) */
function extractTrendKeyword(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export async function fetchGoogleTrendKeywords(
  limit = 20,
): Promise<{ keywords: string[]; feedUrl: string }> {
  const feedUrls = [GOOGLE_TRENDS_TR_RSS_URL, GOOGLE_TRENDS_TR_RSS_FALLBACK];
  let lastError: Error | null = null;

  for (const feedUrl of feedUrls) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const keywords = (feed.items ?? [])
        .map((item) => extractTrendKeyword(item.title ?? ""))
        .filter((k) => k.length >= 2 && !/^https?:\/\//i.test(k))
        .slice(0, limit);

      if (keywords.length > 0) {
        if (feedUrl !== GOOGLE_TRENDS_TR_RSS_URL) {
          console.warn(
            `[kimdir-bot] Birincil Trends RSS (404/boş); yedek: ${feedUrl}`,
          );
        }
        return { keywords, feedUrl };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[kimdir-bot] Trends RSS hatası (${feedUrl}):`, lastError.message);
    }
  }

  throw new Error(
    lastError?.message ??
      "Google Trends TR RSS okunamadı (trendingsearches/daily ve yedek)",
  );
}
