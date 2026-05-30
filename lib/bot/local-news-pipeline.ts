import {
  type FetchNewsItemResult,
  processRssSourceBatch,
} from "@/lib/bot/fetch-news-pipeline";
import { ArticleDuplicateCache } from "@/lib/bot/duplicate-check";
import { FetchNewsPublishSchedule } from "@/lib/bot/publish-schedule";
import {
  buildLocalNewsFeedUrls,
  pickRandomCity,
  type City,
  type LocalNewsFeed,
} from "@/lib/data/cities";
import type { RssSourceRow } from "@/lib/queries/rss-sources";

export type LocalNewsPipelineResult = {
  ok: boolean;
  city: City;
  feeds: LocalNewsFeed[];
  feedsTried: number;
  candidatesChecked: number;
  savedCount: number;
  results: FetchNewsItemResult[];
  errors: string[];
};

function maxSavedPerRun(): number {
  return Math.min(2, Math.max(1, Number(process.env.LOCAL_NEWS_MAX_SAVED ?? 1) || 1));
}

function syntheticRssSource(city: City, feed: LocalNewsFeed): RssSourceRow {
  const now = new Date().toISOString();
  return {
    id: `local-${city.slug}-${feed.id}`,
    name: feed.name,
    url: feed.url,
    city: city.name,
    category: "Yerel Haberler",
    is_active: true,
    created_at: now,
    updated_at: now,
    city_slug: city.slug,
  };
}

/**
 * Yerel haber cron — her çalışmada rastgele 1 il, 3 dinamik RSS (Google News + Habertürk + Hürriyet).
 */
export async function runLocalNewsPipeline(): Promise<LocalNewsPipelineResult> {
  const city = pickRandomCity();
  const feeds = buildLocalNewsFeedUrls(city);
  const maxSaved = maxSavedPerRun();

  const schedule = new FetchNewsPublishSchedule();
  const duplicateCache = new ArticleDuplicateCache();
  await duplicateCache.warm();

  const results: FetchNewsItemResult[] = [];
  const errors: string[] = [];
  let candidatesChecked = 0;
  let savedCount = 0;
  let feedsTried = 0;

  console.info(
    `[local-news] Bu tur: ${city.name} (${city.slug}) — en fazla ${maxSaved} kayıt, ${feeds.length} RSS`,
  );

  for (const feed of feeds) {
    if (savedCount >= maxSaved) break;

    const source = syntheticRssSource(city, feed);
    feedsTried += 1;

    try {
      const pass = await processRssSourceBatch({
        source,
        maxSaved,
        schedule,
        duplicateCache,
        getSavedCount: () => savedCount,
        onSaved: () => {
          savedCount += 1;
        },
        maxItemsPerFeed: 1,
      });

      results.push(...pass.results);
      candidatesChecked += pass.candidatesChecked;
      errors.push(...pass.errors);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "RSS okunamadı";
      console.warn(`[local-news] ${feed.name} atlandı:`, msg);
      errors.push(`${feed.name}: ${msg}`);
    }
  }

  return {
    ok: savedCount > 0 || errors.length === 0,
    city,
    feeds,
    feedsTried,
    candidatesChecked,
    savedCount,
    results,
    errors,
  };
}
