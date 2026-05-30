import { filterPublishedRows, isRowPublished } from "@/lib/articles/publish";
import { coerceViewCount, isMissingViewCountColumn } from "@/lib/articles/view-count-db";
import { normalizeHomeCard } from "@/lib/articles/list-card";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import { safeSlug, safeText } from "@/lib/safe-display";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow } from "@/lib/supabase/rows";
import type { HomeCard } from "@/lib/types/home";

/** Takım / şehir tam metin — slug dahil */
export const TEAM_TEXT_SEARCH_FIELDS = ["title", "slug", "spot_metni", "content"] as const;

export const CITY_TEXT_SEARCH_FIELDS = [
  "title",
  "slug",
  "spot_metni",
  "content",
  "city",
] as const;

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

function escapeIlikePattern(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * PostgREST .or() — virgülden sonra BOŞLUK YOK.
 * Örn: title.ilike.%Galatasaray%,slug.ilike.%Galatasaray%
 */
export function buildOrIlikeFilter(
  fields: readonly string[],
  searchTerm: string,
): string | null {
  const term = searchTerm.trim();
  if (!term) return null;

  const pattern = `%${escapeIlikePattern(term)}%`;
  return fields.map((field) => `${field}.ilike.${pattern}`).join(",");
}

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

function matchesTermInRow(row: ArticleRow, searchTerm: string): boolean {
  const needle = searchTerm.trim().toLocaleLowerCase("tr-TR");
  if (!needle) return false;

  const haystacks = [row.title, row.slug, row.spot_metni, row.content, row.city].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  return haystacks.some((text) => text.toLocaleLowerCase("tr-TR").includes(needle));
}

async function runTextSearchQuery(
  orFilter: string,
  searchTerm: string,
  limit: number,
): Promise<HomeCard[]> {
  const supabase = createSupabaseClient();

  let { data, error } = await filterPublishedRows(
    supabase.from("articles").select(ARTICLE_SELECT),
  )
    .or(orFilter)
    .order("published_at", { ascending: false })
    .limit(limit * 2);

  if (error?.message && isMissingViewCountColumn(error.message)) {
    const fallback = await filterPublishedRows(
      supabase.from("articles").select(ARTICLE_SELECT_NO_VIEW),
    )
      .or(orFilter)
      .order("published_at", { ascending: false })
      .limit(limit * 2);

    if (!fallback.error && fallback.data) {
      data = fallback.data as unknown as typeof data;
      error = null;
    } else {
      error = fallback.error;
    }
  }

  if (error) {
    console.error("[article-text-search]", searchTerm, orFilter, error.message);
    return [];
  }

  const rows = ((data ?? []) as ArticleRow[]).filter(isRowPublished);

  return rows
    .filter((row) => matchesTermInRow(row, searchTerm))
    .slice(0, limit)
    .map(toHomeCard);
}

/** Şehir: başlık, slug, spot, gövde, city sütunu */
export async function fetchArticlesByTextMatch(
  searchTerm: string,
  limit = 32,
): Promise<HomeCard[]> {
  const orFilter = buildOrIlikeFilter(CITY_TEXT_SEARCH_FIELDS, searchTerm);
  if (!orFilter) return [];
  return runTextSearchQuery(orFilter, searchTerm, limit);
}

/** Takım: title + slug (+ spot, content) — kişisel akış */
export async function fetchArticlesByTeamMatch(
  teamName: string,
  limit = 32,
): Promise<HomeCard[]> {
  const searchTerm = teamName.trim();
  if (!searchTerm) return [];

  const orFilter = buildOrIlikeFilter(TEAM_TEXT_SEARCH_FIELDS, searchTerm);
  if (!orFilter) return [];

  return runTextSearchQuery(orFilter, searchTerm, limit);
}
