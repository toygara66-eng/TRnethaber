import { pickRandomCity, type City } from "@/lib/data/cities";
import { isGeminiBusyError, logGeminiBusy } from "@/lib/bot/gemini-client";
import { generateSehirRehberiWithGemini } from "@/lib/bot/sehir-rehberi-gemini";
import { sehirRehberiExistsForCity } from "@/lib/bot/sehir-rehberi-duplicate";
import { persistSehirRehberiArticle } from "@/lib/bot/persist-sehir-rehberi-article";
import { SEYAHAT_CATEGORY_SLUG } from "@/lib/bot/sehir-rehberi-gemini";

export type SehirRehberiPipelineResult = {
  ok: boolean;
  city: City | null;
  saved: boolean;
  articleId: string | null;
  slug: string | null;
  categorySlug: typeof SEYAHAT_CATEGORY_SLUG;
  reason: string;
};

/**
 * Şehir Rehberi Bot — rastgele 1 il, duplicate yoksa Gemini + articles (seyahat).
 */
export async function runSehirRehberiPipeline(): Promise<SehirRehberiPipelineResult> {
  const city = pickRandomCity();

  console.info(`[sehir-rehberi-bot] Seçilen il: ${city.name} (${city.slug})`);

  if (await sehirRehberiExistsForCity(city)) {
    return {
      ok: true,
      city,
      saved: false,
      articleId: null,
      slug: `${city.slug}-gezi-rehberi`,
      categorySlug: SEYAHAT_CATEGORY_SLUG,
      reason: "duplicate_city_guide",
    };
  }

  try {
    const draft = await generateSehirRehberiWithGemini(city);
    if (!draft) {
      return {
        ok: false,
        city,
        saved: false,
        articleId: null,
        slug: null,
        categorySlug: SEYAHAT_CATEGORY_SLUG,
        reason: "invalid_gemini_payload",
      };
    }

    const persisted = await persistSehirRehberiArticle(draft, city);

    if (persisted.action === "skipped_duplicate") {
      return {
        ok: true,
        city,
        saved: false,
        articleId: null,
        slug: persisted.slug,
        categorySlug: SEYAHAT_CATEGORY_SLUG,
        reason: "duplicate_city_guide",
      };
    }

    return {
      ok: true,
      city,
      saved: true,
      articleId: persisted.id,
      slug: persisted.slug,
      categorySlug: SEYAHAT_CATEGORY_SLUG,
      reason: "inserted",
    };
  } catch (err) {
    if (isGeminiBusyError(err)) {
      logGeminiBusy(err);
      return {
        ok: true,
        city,
        saved: false,
        articleId: null,
        slug: null,
        categorySlug: SEYAHAT_CATEGORY_SLUG,
        reason: "gemini_busy",
      };
    }
    throw err;
  }
}
