import { filterPublishedRows, isRowPublished } from "@/lib/articles/publish";
import { coerceViewCount, isMissingViewCountColumn } from "@/lib/articles/view-count-db";
import { getYerelSlugForCity } from "@/lib/user-city";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import { normalizeHomeCard } from "@/lib/articles/list-card";
import { safeSlug, safeText } from "@/lib/safe-display";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow } from "@/lib/supabase/rows";
import type { HomeCard } from "@/lib/types/home";

const ARTICLE_SELECT = `
  id,
  title,
  slug,
  spot_metni,
  kapak_gorseli,
  view_count,
  is_breaking,
  published_at,
  city,
  category_id,
  categories (
    id,
    slug,
    name
  )
`;

function toHomeCard(row: ArticleRow): HomeCard {
  const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  const title = safeText(row.title, "Haber");
  return normalizeHomeCard({
    id: safeText(row.id, row.slug ?? "card"),
    slug: safeSlug(row.slug, "haber"),
    title,
    category: safeText(cat?.name, "Yerel"),
    categorySlug: safeText(cat?.slug, "yerel-haberler"),
    viewCount: coerceViewCount(row.view_count),
    imageSrc: resolveCoverImageSrc(row.kapak_gorseli),
    imageAlt: `${title} kapak görseli`,
    hasCoverImage: Boolean(row.kapak_gorseli?.trim()),
  });
}

async function fetchByCityColumn(cityName: string): Promise<ArticleRow[] | null> {
  const supabase = createSupabaseClient();
  const { data, error } = await filterPublishedRows(
    supabase.from("articles").select(ARTICLE_SELECT).ilike("city", cityName.trim()),
  )
    .order("published_at", { ascending: false })
    .limit(48);

  if (error?.message?.includes("city")) {
    return null;
  }
  if (error) {
    console.error("[city-feed] city column query:", error.message);
    return [];
  }
  return (data ?? []) as ArticleRow[];
}

async function fetchByYerelCategory(cityName: string): Promise<HomeCard[]> {
  const yerelSlug = getYerelSlugForCity(cityName);
  if (!yerelSlug) return [];

  const supabase = createSupabaseClient();
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", yerelSlug)
    .maybeSingle();

  if (catError || !category) return [];

  let { data: articles, error } = await filterPublishedRows(
    supabase
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("category_id", category.id),
  )
    .order("published_at", { ascending: false })
    .limit(48);

  if (error?.message && isMissingViewCountColumn(error.message)) {
    const fallback = await filterPublishedRows(
      supabase
        .from("articles")
        .select(ARTICLE_SELECT.replace("view_count,", "").replace(", view_count", ""))
        .eq("category_id", category.id),
    )
      .order("published_at", { ascending: false })
      .limit(48);
    if (!fallback.error && fallback.data) {
      return ((fallback.data as unknown as ArticleRow[]) ?? [])
        .filter(isRowPublished)
        .map(toHomeCard);
    }
    error = fallback.error;
  }

  if (error) {
    console.error("[city-feed] category query:", error.message);
    return [];
  }

  return ((articles ?? []) as ArticleRow[]).filter(isRowPublished).map(toHomeCard);
}

/** Kullanıcının seçtiği şehre ait yayınlanmış haberler */
export async function getArticlesByCity(cityName: string): Promise<HomeCard[]> {
  const trimmed = cityName.trim();
  if (!trimmed) return [];

  const byCity = await fetchByCityColumn(trimmed);
  if (byCity !== null) {
    if (byCity.length > 0) return byCity.map(toHomeCard);
  }

  return fetchByYerelCategory(trimmed);
}
