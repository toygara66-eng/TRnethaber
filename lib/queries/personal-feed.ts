import { filterPublishedRows, isRowPublished, stripSelectColumns } from "@/lib/articles/publish";
import { isMissingDbColumn } from "@/lib/queries/categories-shared";
import { coerceViewCount, isMissingViewCountColumn } from "@/lib/articles/view-count-db";
import { normalizeHomeCard } from "@/lib/articles/list-card";
import { turnToEnglishFriendly } from "@/lib/personal/normalize-search";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import { safeSlug, safeText } from "@/lib/safe-display";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow } from "@/lib/supabase/rows";
import type { HomeCard } from "@/lib/types/home";

const MAX_FETCH = 600;
const MAX_RESULTS = 48;

const ARTICLE_SELECT = `
  id,
  title,
  slug,
  spot_metni,
  content,
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

const ARTICLE_SELECT_NO_VIEW = ARTICLE_SELECT.replace("view_count,", "").replace(
  ", view_count",
  "",
);

function toHomeCard(row: ArticleRow): HomeCard {
  const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  const title = safeText(row.title, "Haber");
  return normalizeHomeCard({
    id: safeText(row.id, row.slug ?? "card"),
    slug: safeSlug(row.slug, "haber"),
    title,
    dek: safeText(row.spot_metni),
    category: safeText(cat?.name, "Gündem"),
    categorySlug: safeText(cat?.slug, "gundem"),
    viewCount: coerceViewCount(row.view_count),
    imageSrc: resolveCoverImageSrc(row.kapak_gorseli),
    imageAlt: `${title} kapak görseli`,
    hasCoverImage: Boolean(row.kapak_gorseli?.trim()),
  });
}

function articleMatchesProfile(
  article: ArticleRow,
  userTeam: string,
  userCity: string,
): boolean {
  const title = turnToEnglishFriendly(article.title ?? "");
  const content = turnToEnglishFriendly(
    `${article.content ?? ""} ${article.spot_metni ?? ""}`,
  );
  const slug = turnToEnglishFriendly(article.slug ?? "");
  const cityCol = turnToEnglishFriendly(article.city ?? "");

  const matchesTeam =
    Boolean(userTeam) &&
    (title.includes(userTeam) ||
      content.includes(userTeam) ||
      slug.includes(userTeam));

  const matchesCity =
    Boolean(userCity) &&
    (title.includes(userCity) ||
      content.includes(userCity) ||
      slug.includes(userCity) ||
      cityCol.includes(userCity));

  return matchesTeam || matchesCity;
}

async function fetchAllPublishedArticles(): Promise<ArticleRow[]> {
  const supabase = createSupabaseClient();

  let { data, error } = await filterPublishedRows(
    supabase.from("articles").select(ARTICLE_SELECT),
  )
    .order("published_at", { ascending: false })
    .limit(MAX_FETCH);

  if (error?.message && isMissingViewCountColumn(error.message)) {
    const fallback = await filterPublishedRows(
      supabase.from("articles").select(ARTICLE_SELECT_NO_VIEW),
    )
      .order("published_at", { ascending: false })
      .limit(MAX_FETCH);

    if (!fallback.error && fallback.data) {
      data = fallback.data as unknown as typeof data;
      error = null;
    } else {
      error = fallback.error;
    }
  }

  if (error?.message && isMissingDbColumn(error, "city")) {
    const selectNoCity = stripSelectColumns(ARTICLE_SELECT, "city");
    const fallback = await filterPublishedRows(
      supabase.from("articles").select(selectNoCity),
    )
      .order("published_at", { ascending: false })
      .limit(MAX_FETCH);

    if (!fallback.error && fallback.data) {
      data = fallback.data as unknown as typeof data;
      error = null;
    } else if (fallback.error?.message && isMissingViewCountColumn(fallback.error.message)) {
      const selectPlain = stripSelectColumns(ARTICLE_SELECT_NO_VIEW, "city");
      const plain = await filterPublishedRows(
        supabase.from("articles").select(selectPlain),
      )
        .order("published_at", { ascending: false })
        .limit(MAX_FETCH);
      if (!plain.error && plain.data) {
        data = plain.data as unknown as typeof data;
        error = null;
      } else {
        error = plain.error;
      }
    } else {
      error = fallback.error;
    }
  }

  if (error) {
    console.error("[personal-feed] fetch articles:", error.message);
    return [];
  }

  return ((data ?? []) as ArticleRow[]).filter(isRowPublished);
}

/**
 * Kişisel akış — DB'den yayınlanmış haberler, JS tarafında Türkçe-duyarsız filtre.
 */
export async function getPersonalizedFeed(
  city: string,
  favoriteTeam?: string | null,
): Promise<HomeCard[]> {
  const userCity = turnToEnglishFriendly(city ?? "");
  const userTeam = turnToEnglishFriendly(favoriteTeam ?? "");

  if (!userCity && !userTeam) return [];

  const articles = await fetchAllPublishedArticles();

  const filteredArticles = articles.filter((article) =>
    articleMatchesProfile(article, userTeam, userCity),
  );

  return filteredArticles.slice(0, MAX_RESULTS).map(toHomeCard);
}
