import { ArticleDuplicateCache } from "@/lib/bot/duplicate-check";
import { fetchGoogleTrendKeywords } from "@/lib/bot/google-trends-rss";
import { articleExistsForPersonName } from "@/lib/bot/kahin-article-duplicate";
import {
  analyzeTrendKeywordWithGemini,
  finalizeKahinPerson,
} from "@/lib/bot/kahin-gemini";
import { persistKahinKimdirArticle } from "@/lib/bot/persist-kahin-article";
import { isGeminiBusyError, logGeminiBusy } from "@/lib/bot/gemini-client";

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

/**
 * Kahin (kimdir-bot) — Google Trends TR anahtar kelime → Gemini kişi filtresi → articles (kimdir).
 * Tur başına en fazla 1 Gemini çağrısı ve en fazla 1 yeni kişi kaydı (timeout koruması).
 */
export async function runKahinPipeline(): Promise<KahinPipelineResult> {
  const duplicateCache = new ArticleDuplicateCache();
  await duplicateCache.warm(400);

  const { keywords, feedUrl } = await fetchGoogleTrendKeywords(5);

  const empty: KahinPipelineResult = {
    ok: keywords.length > 0,
    feedUrl,
    keywordsFound: keywords.length,
    keywordTried: null,
    isPerson: false,
    saved: false,
    articleId: null,
    slug: null,
    personName: null,
    categorySlug: "kimdir",
    reason: "no_eligible_keyword",
  };

  let keywordTried: string | null = null;

  for (const keyword of keywords) {
    if (await articleExistsForPersonName(keyword, duplicateCache)) {
      continue;
    }

    keywordTried = keyword;
    console.info(`[kimdir-bot] Trend anahtar kelime deneniyor: ${keyword}`);

    try {
      const gemini = await analyzeTrendKeywordWithGemini(keyword);

      if (!gemini.isPerson) {
        console.info(`[kimdir-bot] "${keyword}" bir insan değil, sıradaki kelimeye geçiliyor...`);
        await new Promise(resolve => setTimeout(resolve, 4000));
        continue;
      }

      const draft = finalizeKahinPerson(gemini, keyword);
      if (!draft) {
        console.warn(`[kimdir-bot] "${keyword}" için eksik veri geldi, sıradaki kelimeye geçiliyor...`);
        await new Promise(resolve => setTimeout(resolve, 4000));
        continue;
      }

      if (await articleExistsForPersonName(draft.personName, duplicateCache)) {
        console.info(`[kimdir-bot] "${draft.personName}" zaten kayıtlı, sıradakine geçiliyor...`);
        continue;
      }

      const persisted = await persistKahinKimdirArticle(draft, keyword);

      if (persisted.action === "skipped_duplicate") {
        continue;
      }

      duplicateCache.register({ title: draft.title, slug: persisted.slug });

      return {
        ok: true,
        feedUrl,
        keywordsFound: keywords.length,
        keywordTried,
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
        console.warn(`[kimdir-bot] Sunucu "${keyword}" için meşgul! 10 saniye beklenip diğer kelime denenecek...`);
        
        // 🔥 İŞTE BÜYÜK DEĞİŞİKLİK BURADA: RETURN YERİNE CONTINUE!
        // Sistemi kapatmak yerine 10 saniye nefes alıp diğer kelimeye saldıracak.
        await new Promise(resolve => setTimeout(resolve, 3000)); 
        continue; 
      }
      throw err;
    }
  }

  return {
    ...empty,
    reason: keywordTried ? "no_person_found_in_all_keywords" : "all_keywords_duplicate_or_empty",
  };
}
