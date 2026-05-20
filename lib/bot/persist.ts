import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SynthesizedArticle } from "@/lib/bot/synthesizer";

export async function persistSynthesizedArticle(
  article: SynthesizedArticle,
  sourceUrl?: string,
): Promise<{ id: string; slug: string }> {
  const supabase = createSupabaseAdminClient();

  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", article.categorySlug)
    .maybeSingle();

  if (catError || !category) {
    throw new Error(`Kategori bulunamadı: ${article.categorySlug}`);
  }

  const basePayload = {
    title: article.title,
    slug: article.slug,
    spot_metni: article.spot_metni,
    content: article.content,
    kapak_gorseli: article.kapak_gorseli,
    category_id: category.id,
    yazar: article.yazar,
    okuma_sayisi: article.okuma_sayisi,
    is_breaking: article.is_breaking,
    published_at: new Date().toISOString(),
  };

  const fullPayload = {
    ...basePayload,
    seo_keywords: article.seo_keywords || null,
    meta_description: article.meta_description || null,
    ...(sourceUrl?.trim() ? { source_url: sourceUrl.trim() } : {}),
  };

  let { data, error } = await supabase
    .from("articles")
    .insert(fullPayload)
    .select("id, slug")
    .single();

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
      throw new Error(`Slug çakışması: ${article.slug}`);
    }
    throw new Error(error?.message ?? "Supabase insert başarısız");
  }

  return { id: data.id, slug: data.slug };
}
