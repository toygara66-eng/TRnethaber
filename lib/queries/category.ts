import { filterPublishedRows, isRowPublished } from "@/lib/articles/publish";
import { coerceViewCount, isMissingViewCountColumn } from "@/lib/articles/view-count-db";
import { normalizeHomeCard } from "@/lib/articles/list-card";
import {
  decodeCategorySlugParam,
  isYerelHubSlug,
  isYerelProvinceSlug,
  matchCategoryFromList,
} from "@/lib/categories/slug-resolve";
import { YEREL_HABERLER_SLUG } from "@/lib/data/turkiye-iller";
import { safeSlug, safeText } from "@/lib/safe-display";
import { getArticlesByCity } from "@/lib/queries/city-feed";
import { isMissingDbColumn } from "@/lib/queries/categories-shared";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow, CategoryRow } from "@/lib/supabase/rows";
import type { TurkiyeIl } from "@/lib/data/turkiye-iller";
import type { HomeCard } from "@/lib/types/home";
import { findIlBySlug, getCitySlugFromYerelCategorySlug } from "@/lib/user-city";

export type CategoryPageData = {
  category: CategoryRow;
  parent: CategoryRow | null;
  children: CategoryRow[];
  cards: HomeCard[];
  /** İl sayfası — başlık ve breadcrumb için */
  localCity?: TurkiyeIl;
};

function yerelProvincePageTitle(il: TurkiyeIl): string {
  return `Yerel Haberler - ${il.name}`;
}

function withProvinceDisplayName(cat: CategoryRow, il: TurkiyeIl): CategoryRow {
  return { ...cat, name: yerelProvincePageTitle(il) };
}

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
    dek: safeText(row.spot_metni),
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

async function fetchYerelHubCategory(): Promise<CategoryRow | null> {
  const hub =
    (await fetchCategoryBySlug(YEREL_HABERLER_SLUG)) ??
    (await fetchCategoryBySlug("yerel"));
  return hub;
}

async function buildCityCategoryPageData(il: TurkiyeIl): Promise<CategoryPageData> {
  const parent = await fetchYerelHubCategory();
  const dbCategory = await fetchCategoryBySlug(il.slug);
  const cards = await getArticlesByCity(il.name, getCitySlugFromYerelCategorySlug(il.slug));

  const category: CategoryRow = dbCategory
    ? withProvinceDisplayName(dbCategory, il)
    : {
        id: `city-${il.slug}`,
        slug: il.slug,
        name: yerelProvincePageTitle(il),
        parent_id: parent?.id ?? null,
      };

  return {
    category,
    parent,
    children: [],
    cards,
    localCity: il,
  };
}

export async function getCategoryPageData(slugParam: string): Promise<CategoryPageData | null> {
  try {
    const decoded = decodeCategorySlugParam(slugParam);
    if (!decoded) return null;

    let cat = await fetchCategoryBySlug(decoded);

    const ilFromSlug = findIlBySlug(decoded);
    if (!cat && ilFromSlug) {
      cat = await fetchCategoryBySlug(ilFromSlug.slug);
    }

    if (!cat && ilFromSlug) {
      return buildCityCategoryPageData(ilFromSlug);
    }

    if (!cat) return null;

    const il =
      ilFromSlug ?? (isYerelProvinceSlug(cat.slug) ? findIlBySlug(cat.slug) : undefined);
    const displayCat = il ? withProvinceDisplayName(cat, il) : cat;

    let parent: CategoryRow | null = null;
    if (displayCat.parent_id) {
      parent = await fetchParentCategory(displayCat.parent_id);
    } else if (il) {
      parent = await fetchYerelHubCategory();
    }

    const children = await fetchChildCategories(displayCat.id);

    const categoryIds =
      children.length > 0 || isYerelHubSlug(displayCat.slug)
        ? [displayCat.id, ...children.map((c) => c.id)]
        : [displayCat.id];

    let cards = await fetchArticlesForCategoryIds(
      categoryIds,
      displayCat.name,
      displayCat.slug,
    );

    if (il && cards.length === 0) {
      cards = await getArticlesByCity(il.name, getCitySlugFromYerelCategorySlug(il.slug));
    }

    return {
      category: displayCat,
      parent,
      children,
      cards,
      ...(il ? { localCity: il } : {}),
    };
  } catch (err) {
    console.error("[getCategoryPageData]", err);
    return null;
  }
}
