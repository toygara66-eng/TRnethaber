import { assignReporterForArticle } from "@/lib/bot/assign-reporter";
import {
  SEYAHAT_CATEGORY_SLUG,
  type SehirRehberiDraft,
} from "@/lib/bot/sehir-rehberi-gemini";
import {
  buildSehirRehberiSlug,
  sehirRehberiExistsForCity,
} from "@/lib/bot/sehir-rehberi-duplicate";
import { stripArticleContentForPersist } from "@/lib/bot/strip-article-content";
import type { City } from "@/lib/data/cities";
import { buildPicsumCoverUrl } from "@/lib/images/cover";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { searchUnsplash } from "@/utils/image-agent";

export type SehirRehberiPersistResult =
  | { action: "inserted"; id: string; slug: string; city: City }
  | { action: "skipped_duplicate"; slug: string; city: City };

async function resolveCityCoverImage(city: City, slug: string): Promise<string> {
  try {
    const result = await Promise.race([
      searchUnsplash(`${city.name} Turkey city travel landscape`),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000)),
    ]);
    if (result && "url" in result && result.url) {
      return result.url;
    }
  } catch {
    /* fallback */
  }
  return buildPicsumCoverUrl(slug);
}

export async function persistSehirRehberiArticle(
  draft: SehirRehberiDraft,
  city: City,
): Promise<SehirRehberiPersistResult> {
  const slug = buildSehirRehberiSlug(city);

  if (await sehirRehberiExistsForCity(city)) {
    return { action: "skipped_duplicate", slug, city };
  }

  const supabase = createSupabaseAdminClient();

  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", SEYAHAT_CATEGORY_SLUG)
    .maybeSingle();

  if (catError || !category) {
    throw new Error(
      `Seyahat kategorisi bulunamadı (${SEYAHAT_CATEGORY_SLUG}). Migration çalıştırın.`,
    );
  }

  const kapak_gorseli = await resolveCityCoverImage(city, slug);
  const content = stripArticleContentForPersist(draft.contentHtml);
  const yazar = assignReporterForArticle({
    title: draft.title,
    lead: draft.summary,
    body: content,
    categorySlug: SEYAHAT_CATEGORY_SLUG,
    categoryName: "Seyahat",
    explicitCity: city.name,
  });

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
    city: city.name,
    city_slug: city.slug,
    seo_keywords: draft.seoKeywords,
    meta_description: draft.metaDescription,
    source_url: `https://trnethaber.com/kategori/${SEYAHAT_CATEGORY_SLUG}`,
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

  if (error?.message?.includes("city_slug")) {
    const { city_slug: _cs, ...withoutCitySlug } = basePayload;
    ({ data, error } = await supabase
      .from("articles")
      .insert(withoutCitySlug)
      .select("id, slug")
      .single());
  }

  if (
    error &&
    (error.message?.includes("seo_keywords") ||
      error.message?.includes("meta_description") ||
      error.message?.includes("source_url") ||
      error.message?.includes("city"))
  ) {
    const {
      seo_keywords: _sk,
      meta_description: _md,
      source_url: _su,
      city: _c,
      city_slug: _cs,
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
      return { action: "skipped_duplicate", slug, city };
    }
    throw new Error(`Şehir rehberi insert: ${error.message}`);
  }

  if (!data) {
    throw new Error("Şehir rehberi insert: kayıt dönmedi");
  }

  return { action: "inserted", id: data.id, slug: data.slug, city };
}
