import { assignReporterForArticle } from "@/lib/bot/assign-reporter";
import { articleExistsForPersonName } from "@/lib/bot/kahin-article-duplicate";
import { resolveKimdirPersonCoverImage } from "@/lib/bot/kahin-person-image";
import { KIMDIR_CATEGORY_SLUG, type KahinPersonDraft } from "@/lib/bot/kahin-gemini";
import { stripArticleContentForPersist } from "@/lib/bot/strip-article-content";
import { registerYazilmisKisi } from "@/lib/bot/yazilmis-kisiler";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugifyTitle } from "@/lib/slug";

export type KahinArticlePersistResult =
  | { action: "inserted"; slug: string; id: string; personName: string }
  | { action: "skipped_duplicate"; slug: string; personName: string };

/** Kahin — kimdir kategorisinde articles kaydı (yalnızca yoksa) */
export async function persistKahinKimdirArticle(
  draft: KahinPersonDraft,
  trendKeyword: string,
): Promise<KahinArticlePersistResult> {
  const personName = draft.personName.trim();
  const slug = `${slugifyTitle(personName)}-kimdir`;

  if (await articleExistsForPersonName(personName)) {
    return { action: "skipped_duplicate", slug, personName };
  }

  const supabase = createSupabaseAdminClient();

  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", KIMDIR_CATEGORY_SLUG)
    .maybeSingle();

  if (catError || !category) {
    throw new Error(
      `Kimdir kategorisi bulunamadı (${KIMDIR_CATEGORY_SLUG}). Migration çalıştırın.`,
    );
  }

  const cover = await resolveKimdirPersonCoverImage(personName, slug);
  const kapak_gorseli = cover.url;
  console.info(
    `[kimdir-bot] Kapak görseli (${cover.source}): ${personName}`,
  );
  const content = stripArticleContentForPersist(draft.contentHtml);
  const yazar = assignReporterForArticle({
    title: draft.title,
    lead: draft.summary,
    body: content,
    categorySlug: KIMDIR_CATEGORY_SLUG,
    categoryName: "Kimdir",
  });

  const source_url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(trendKeyword)}&geo=TR`;

  const basePayload = {
    title: draft.title,
    slug,
    spot_metni: draft.summary,
    content,
    kapak_gorseli,
    category_id: category.id,
    yazar,
    okuma_sayisi: "0 okuma",
    view_count: 0,
    is_breaking: false,
    is_published: true,
    published_at: new Date().toISOString(),
    seo_keywords: draft.seoKeywords,
    meta_description: draft.metaDescription,
    source_url,
  };

  let { data, error } = await supabase
    .from("articles")
    .insert(basePayload)
    .select("id, slug")
    .single();

  if (error?.message?.includes("view_count")) {
    const { view_count: _v, ...withoutView } = basePayload;
    ({ data, error } = await supabase
      .from("articles")
      .insert(withoutView)
      .select("id, slug")
      .single());
  }

  if (
    error &&
    (error.message?.includes("seo_keywords") ||
      error.message?.includes("meta_description") ||
      error.message?.includes("source_url"))
  ) {
    const {
      seo_keywords: _sk,
      meta_description: _md,
      source_url: _su,
      ...minimal
    } = basePayload;
    ({ data, error } = await supabase
      .from("articles")
      .insert(minimal)
      .select("id, slug")
      .single());
  }

  if (error) {
    if (error.code === "23505") {
      return { action: "skipped_duplicate", slug, personName };
    }
    throw new Error(`Kahin article insert: ${error.message}`);
  }

  if (!data) {
    throw new Error("Kahin article insert: kayıt dönmedi");
  }

  await registerYazilmisKisi({
    personName,
    trendKeyword,
    articleId: data.id,
  });

  return {
    action: "inserted",
    id: data.id,
    slug: data.slug,
    personName,
  };
}
