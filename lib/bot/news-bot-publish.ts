import { revalidatePath } from "next/cache";
import {
  patchArticleSocialShared,
  platformsFromShareResult,
} from "@/lib/articles/social-shared-db";
import type { NewsBotPipelineResult } from "@/lib/bot/pipeline";
import { shareToSocialMedia } from "@/lib/services/social-share";

export async function publishSavedNewsBotResults(
  savedResults: Extract<NewsBotPipelineResult, { skipped: false }>[],
): Promise<unknown[]> {
  const socialPosts = [];

  for (const row of savedResults) {
    try {
      const social = await shareToSocialMedia({
        title: row.article.title,
        spot: row.article.spot_metni,
        slug: row.article.slug,
        isBreaking: row.article.is_breaking,
      });

      if (row.article.id) {
        const patch = platformsFromShareResult(social);
        if (Object.keys(patch).length > 0) {
          await patchArticleSocialShared(row.article.id, patch);
        }
      }

      socialPosts.push(social);
    } catch (err) {
      console.error("[news-bot] social-share:", err);
      socialPosts.push(null);
    }

    revalidatePath(`/haber/${row.article.slug}`);
    for (const entity of row.entities) {
      revalidatePath(`/kimdir/${entity.slug}`);
    }
  }

  if (savedResults.length > 0) {
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/articles");
    revalidatePath("/admin/varliklar");
  }

  return socialPosts;
}
