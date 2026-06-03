import { ArticleDuplicateCache } from "@/lib/bot/duplicate-check";
import { fetchGoogleTrendKeywords } from "@/lib/bot/google-trends-rss";
import { articleExistsForPersonName } from "@/lib/bot/kahin-article-duplicate";
import {
  analyzeTrendKeywordWithGemini,
  finalizeKahinPerson,
} from "@/lib/bot/kahin-gemini";
import { persistKahinKimdirArticle } from "@/lib/bot/persist-kahin-article";
import { isGeminiBusyError, logGeminiBusy } from "@/lib/bot/gemini-client";
import { isYazilmisKisi } from "@/lib/bot/yazilmis-kisiler";

export type KahinPipelineResult = {
  ok: boolean;
  feedUrl: string;
  keywordsFound: number;
  keywordTried: string | null;
  isPerson: boolean;
  saved: boolean;
  articleId: string | null;
  slug: string | null;
  personName: string | null;
  categorySlug: "kimdir";
  reason: string;
};

const TREND_KEYWORD_POOL = 20;

function emptyResult(
  feedUrl: string,
  keywordsFound: number,
  keywordTried: string | null,
  reason: string,
): KahinPipelineResult {
  return {
    ok: keywordsFound > 0,
    feedUrl,
    keywordsFound,
    keywordTried,
    isPerson: false,
    saved: false,
    articleId: null,
    slug: null,
    personName: null,
    categorySlug: "kimdir",
    reason,
  };
}

async function pickFirstEligibleKeyword(
  keywords: string[],
  duplicateCache: ArticleDuplicateCache,
): Promise<string | null> {
  for (const keyword of keywords) {
    if (await isYazilmisKisi(keyword)) {
      console.info(
        `[kimdir-bot] "${keyword}" yazilmis_kisiler'de — atlanıyor.`,
      );
      continue;
    }
    if (await articleExistsForPersonName(keyword, duplicateCache)) {
      continue;
    }
    return keyword;
  }
  return null;
}

/**
 * Kahin (kimdir-bot) — tek cron = tek trend kelimesi = tek LLM çağrısı = en fazla 1 kayıt.
 */
export async function runKahinPipeline(): Promise<KahinPipelineResult> {
  const duplicateCache = new ArticleDuplicateCache();
  await duplicateCache.warm(400);

  const { keywords, feedUrl } = await fetchGoogleTrendKeywords(TREND_KEYWORD_POOL);
  const keyword = await pickFirstEligibleKeyword(keywords, duplicateCache);

  if (!keyword) {
    return emptyResult(
      feedUrl,
      keywords.length,
      null,
      keywords.length === 0
        ? "no_eligible_keyword"
        : "all_keywords_duplicate_or_empty",
    );
  }

  console.info(`[kimdir-bot] Tekli işlem — trend: ${keyword}`);

  try {
    const gemini = await analyzeTrendKeywordWithGemini(keyword);

    if (!gemini.isPerson) {
      console.info(
        `[kimdir-bot] "${keyword}" bir insan değil; sonraki cron'da yeni kelime denenecek.`,
      );
      return {
        ...emptyResult(feedUrl, keywords.length, keyword, "not_a_person"),
        isPerson: false,
      };
    }

    const draft = finalizeKahinPerson(gemini, keyword);
    if (!draft) {
      console.warn(
        `[kimdir-bot] "${keyword}" için eksik veri; sonraki cron'a bırakıldı.`,
      );
      return emptyResult(feedUrl, keywords.length, keyword, "incomplete_draft");
    }

    if (await isYazilmisKisi(draft.personName)) {
      return emptyResult(
        feedUrl,
        keywords.length,
        keyword,
        "person_already_written",
      );
    }

    if (await articleExistsForPersonName(draft.personName, duplicateCache)) {
      return emptyResult(
        feedUrl,
        keywords.length,
        keyword,
        "person_duplicate_article",
      );
    }

    const persisted = await persistKahinKimdirArticle(draft, keyword);

    if (persisted.action === "skipped_duplicate") {
      return emptyResult(feedUrl, keywords.length, keyword, "skipped_duplicate");
    }

    duplicateCache.register({ title: draft.title, slug: persisted.slug });

    return {
      ok: true,
      feedUrl,
      keywordsFound: keywords.length,
      keywordTried: keyword,
      isPerson: true,
      saved: true,
      articleId: persisted.id,
      slug: persisted.slug,
      personName: persisted.personName,
      categorySlug: "kimdir",
      reason: "inserted",
    };
  } catch (err) {
    if (isGeminiBusyError(err)) {
      logGeminiBusy(err);
      return {
        ...emptyResult(feedUrl, keywords.length, keyword, "gemini_busy"),
        ok: true,
      };
    }
    throw err;
  }
}
