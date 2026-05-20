import { resolveViewCountLabel } from "@/lib/articles/labels";
import { YEREL_HABERLER_SLUG } from "@/lib/data/turkiye-iller";
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
  okuma_sayisi,
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

function toHomeCard(row: ArticleRow, categoryName: string): HomeCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: categoryName,
    readCountLabel: resolveViewCountLabel(row.okuma_sayisi, row.slug),
    imageSrc: resolveCoverImageSrc(row.kapak_gorseli),
    imageAlt: coverAlt(row.title),
  };
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
    if (plain.error || !plain.data) return null;
    return { ...(plain.data as CategoryRow), parent_id: null };
  }

  if (full.error) {
    console.error("[getCategoryPageData] category", full.error);
  }
  return null;
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
): Promise<HomeCard[]> {
  if (categoryIds.length === 0) return [];

  const supabase = createSupabaseClient();
  const { data: articles, error } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .in("category_id", categoryIds)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[getCategoryPageData] articles", error);
    return [];
  }

  return ((articles ?? []) as ArticleRow[]).map((row) => toHomeCard(row, categoryName));
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
      children.length > 0 || cat.slug === YEREL_HABERLER_SLUG
        ? [cat.id, ...children.map((c) => c.id)]
        : [cat.id];

    const cards = await fetchArticlesForCategoryIds(categoryIds, cat.name);

    return { category: cat, parent, children, cards };
  } catch (err) {
    console.error("[getCategoryPageData]", err);
    return null;
  }
}
