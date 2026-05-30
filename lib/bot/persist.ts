import {
  ArticleDuplicateCache,
  findDuplicateForSave,
} from "@/lib/bot/duplicate-check";
import { awaitPublishJitter } from "@/lib/bot/publish-jitter";
import { cleanRssSourceUrl } from "@/lib/bot/source-url";
import { stripArticleContentForPersist } from "@/lib/bot/strip-article-content";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SynthesizedArticle } from "@/lib/bot/synthesizer";

export async function persistSynthesizedArticle(
  article: SynthesizedArticle,
  sourceUrl?: string,
  duplicateCache?: ArticleDuplicateCache,
): Promise<{ id: string; slug: string }> {
  const { waitedMs } = await awaitPublishJitter();
  console.info(`[persist] Yayın gecikmesi: ${Math.round(waitedMs / 1000)} sn`);

  const cleanUrl = sourceUrl?.trim() ? cleanRssSourceUrl(sourceUrl) || sourceUrl.trim() : "";
  const cache = duplicateCache ?? new ArticleDuplicateCache();
  if (!duplicateCache) await cache.warm();

  const dupBeforeSave = await findDuplicateForSave(
    {
      title: article.title,
      slug: article.slug,
      sourceUrl: cleanUrl || sourceUrl,
    },
    cache,
  );
  if (dupBeforeSave) {
    throw new Error(`duplicate_${dupBeforeSave}`);
  }

  const supabase = createSupabaseAdminClient();

  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", article.categorySlug)
    .maybeSingle();

  if (catError || !category) {
    throw new Error(`Kategori bulunamadı: ${article.categorySlug}`);
  }

  const content = stripArticleContentForPersist(article.content);

  const basePayload = {
    title: article.title,
    slug: article.slug,
    spot_metni: article.spot_metni,
    content,
    kapak_gorseli: article.kapak_gorseli,
    category_id: category.id,
    yazar: article.yazar,
    okuma_sayisi: article.okuma_sayisi,
    view_count: 0,
    is_breaking: article.is_breaking,
    published_at: new Date().toISOString(),
  };

  const fullPayload = {
    ...basePayload,
    seo_keywords: article.seo_keywords || null,
    meta_description: article.meta_description || null,
    ...(cleanUrl ? { source_url: cleanUrl } : {}),
  };

  let { data, error } = await supabase
    .from("articles")
    .insert(fullPayload)
    .select("id, slug")
    .single();

  if (error?.message?.includes("view_count")) {
    const { view_count: _v, ...withoutView } = basePayload as typeof basePayload & {
      view_count: number;
    };
    const retryView = await supabase.from("articles").insert(withoutView).select("id, slug").single();
    data = retryView.data;
    error = retryView.error;
  }

  if (
    error &&
    (error.message?.includes("seo_keywords") ||
      error.message?.includes("meta_description") ||
      error.message?.includes("source_url"))
  ) {
    const retry = await supabase.from("articles").insert(basePayload).select("id, slug").single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    if (error?.code === "23505") {
      throw new Error(`duplicate_slug`);
    }
    throw new Error(error?.message ?? "Supabase insert başarısız");
  }

  cache.register({
    title: article.title,
    slug: data.slug,
    sourceUrl: cleanUrl || sourceUrl,
  });

  return { id: data.id, slug: data.slug };
}
