import { assignReporterForArticle } from "@/lib/bot/assign-reporter";
import {
  SEYAHAT_CATEGORY_SLUG,
  type SehirRehberiDraft,
} from "@/lib/bot/sehir-rehberi-gemini";
import {
  buildSehirRehberiSlug,
  sehirRehberiExistsForCity,
} from "@/lib/bot/sehir-rehberi-duplicate";
import { resolveSehirRehberiCoverImage } from "@/lib/bot/sehir-rehberi-wikipedia-image";
import { stripArticleContentForPersist } from "@/lib/bot/strip-article-content";
import type { City } from "@/lib/data/cities";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SehirRehberiPersistResult =
  | { action: "inserted"; id: string; slug: string; city: City }
  | { action: "skipped_duplicate"; slug: string; city: City };

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

  const cityName = draft.cityName?.trim() || city.name.trim();
  const cover = await resolveSehirRehberiCoverImage(cityName, slug);
  const kapak_gorseli = cover.kapak;

  console.info(
    `[sehir-rehberi-bot] ${cityName} kapak görseli: ${cover.source} → ${kapak_gorseli.slice(0, 80)}`,
  );

  const content = stripArticleContentForPersist(draft.contentHtml);
  const yazar = assignReporterForArticle({
    title: draft.title,
    lead: draft.summary,
    body: content,
    categorySlug: SEYAHAT_CATEGORY_SLUG,
    categoryName: "Seyahat",
    explicitCity: cityName,
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
    city: cityName,
    city_slug: city.slug,
    seo_keywords: draft.seoKeywords,
    meta_description: draft.metaDescription,
    source_url: `https://tr.wikipedia.org/wiki/${encodeURIComponent(cityName.replace(/\s+/g, "_"))}`,
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
