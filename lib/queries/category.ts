import { filterPublishedRows, isRowPublished } from "@/lib/articles/publish";
import { coerceViewCount, isMissingViewCountColumn } from "@/lib/articles/view-count-db";
import { normalizeHomeCard } from "@/lib/articles/list-card";
import { safeSlug, safeText } from "@/lib/safe-display";
import {
  isYerelHubSlug,
  matchCategoryFromList,
} from "@/lib/categories/slug-resolve";
import { isMissingDbColumn } from "@/lib/queries/categories-shared";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow, CategoryRow } from "@/lib/supabase/rows";
import type { HomeCard } from "@/lib/types/home";

export type CategoryPageData = {
  category: CategoryRow;
  parent: CategoryRow | null;
  children: CategoryRow[];
  cards: HomeCard[];
};

const ARTICLE_SELECT = `
  id,
  title,
  slug,
  spot_metni,
  kapak_gorseli,
  view_count,
  is_breaking,
  published_at,
  category_id,
  categories (
    id,
    slug,
    name
  )
`;

function coverAlt(title: string): string {
  return `${title} kapak görseli, soyut, yüz ve yazı yok`;
}

function toHomeCard(row: ArticleRow, categoryName: string, categorySlug: string): HomeCard {
  const title = safeText(row.title, "Haber");
  return normalizeHomeCard({
    id: safeText(row.id, row.slug ?? "card"),
    slug: safeSlug(row.slug, "haber"),
    title,
    category: safeText(categoryName, "Gündem"),
    categorySlug: safeText(categorySlug, "gundem"),
    viewCount: coerceViewCount((row as ArticleRow & { view_count?: unknown }).view_count),
    imageSrc: resolveCoverImageSrc(row.kapak_gorseli),
    imageAlt: coverAlt(title),
    hasCoverImage: Boolean(row.kapak_gorseli?.trim()),
  });
}

async function fetchAllCategories(): Promise<CategoryRow[]> {
  const supabase = createSupabaseClient();

  const full = await supabase
    .from("categories")
    .select("id, slug, name, parent_id")
    .order("name");

  if (!full.error && full.data) {
    return full.data as CategoryRow[];
  }

  if (isMissingDbColumn(full.error, "parent_id")) {
    const plain = await supabase.from("categories").select("id, slug, name").order("name");
    if (plain.error || !plain.data) return [];
    return (plain.data as CategoryRow[]).map((c) => ({ ...c, parent_id: null }));
  }

  if (full.error) {
    console.error("[getCategoryPageData] categories list", full.error);
  }
  return [];
}

async function fetchCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const supabase = createSupabaseClient();

  const full = await supabase
    .from("categories")
    .select("id, slug, name, parent_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!full.error && full.data) {
    return full.data as CategoryRow;
  }

  if (isMissingDbColumn(full.error, "parent_id")) {
    const plain = await supabase
      .from("categories")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();
    if (plain.error || !plain.data) {
      const all = await fetchAllCategories();
      return matchCategoryFromList(slug, all);
    }
    return { ...(plain.data as CategoryRow), parent_id: null };
  }

  if (full.error) {
    console.error("[getCategoryPageData] category exact", full.error);
  }

  const all = await fetchAllCategories();
  return matchCategoryFromList(slug, all);
}

async function fetchChildCategories(parentId: string): Promise<CategoryRow[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, parent_id")
    .eq("parent_id", parentId)
    .order("name");

  if (error) {
    if (!isMissingDbColumn(error, "parent_id")) {
      console.error("[getCategoryPageData] children", error);
    }
    return [];
  }
  return (data ?? []) as CategoryRow[];
}

async function fetchParentCategory(parentId: string): Promise<CategoryRow | null> {
  const supabase = createSupabaseClient();
  const full = await supabase
    .from("categories")
    .select("id, slug, name, parent_id")
    .eq("id", parentId)
    .maybeSingle();

  if (!full.error && full.data) {
    return full.data as CategoryRow;
  }

  if (isMissingDbColumn(full.error, "parent_id")) {
    const plain = await supabase
      .from("categories")
      .select("id, slug, name")
      .eq("id", parentId)
      .maybeSingle();
    return plain.data ? { ...(plain.data as CategoryRow), parent_id: null } : null;
  }

  return null;
}

async function fetchArticlesForCategoryIds(
  categoryIds: string[],
  categoryName: string,
  categorySlug: string,
): Promise<HomeCard[]> {
  if (categoryIds.length === 0) return [];

  const supabase = createSupabaseClient();
  let { data: articles, error } = await filterPublishedRows(
    supabase.from("articles").select(ARTICLE_SELECT).in("category_id", categoryIds),
  ).order("published_at", { ascending: false });

  if (error?.message && isMissingViewCountColumn(error.message)) {
    const fallback = await filterPublishedRows(
      supabase
        .from("articles")
        .select(ARTICLE_SELECT.replace("view_count,", "").replace(", view_count", ""))
        .in("category_id", categoryIds),
    ).order("published_at", { ascending: false });
    if (!fallback.error && fallback.data) {
      return ((fallback.data as unknown as ArticleRow[]) ?? [])
        .filter((r) => isRowPublished(r))
        .map((r) => toHomeCard(r, categoryName, categorySlug));
    }
    error = fallback.error;
  }

  if (error) {
    console.error("[getCategoryPageData] articles", error);
    return [];
  }

  return ((articles ?? []) as ArticleRow[])
    .filter((r) => isRowPublished(r))
    .map((row) => toHomeCard(row, categoryName, categorySlug));
}

export async function getAllCategorySlugs(): Promise<string[]> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from("categories").select("slug");
    if (error || !data) return [];
    return data.map((r) => r.slug);
  } catch {
    return [];
  }
}

export async function getCategoryPageData(slug: string): Promise<CategoryPageData | null> {
  try {
    const cat = await fetchCategoryBySlug(slug);
    if (!cat) return null;

    let parent: CategoryRow | null = null;
    if (cat.parent_id) {
      parent = await fetchParentCategory(cat.parent_id);
    }

    const children = await fetchChildCategories(cat.id);

    const categoryIds =
      children.length > 0 || isYerelHubSlug(cat.slug)
        ? [cat.id, ...children.map((c) => c.id)]
        : [cat.id];

    const cards = await fetchArticlesForCategoryIds(categoryIds, cat.name, cat.slug);

    return { category: cat, parent, children, cards };
  } catch (err) {
    console.error("[getCategoryPageData]", err);
    return null;
  }
}
