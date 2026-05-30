import { filterPublishedRows } from "@/lib/articles/publish";
import { createSupabaseClient } from "@/lib/supabase";

export const SITEMAP_ARTICLE_LIMIT = 1000;

export type SitemapArticleRow = {
  slug: string;
  published_at: string;
  updated_at: string | null;
};

/**
 * Yayında olan en güncel haberler (timeout önlemi: üst sınır 1000).
 */
export async function fetchPublishedArticlesForSitemap(): Promise<SitemapArticleRow[]> {
  const supabase = createSupabaseClient();

  let query = supabase
    .from("articles")
    .select("slug, published_at, updated_at")
    .order("published_at", { ascending: false })
    .limit(SITEMAP_ARTICLE_LIMIT);

  query = filterPublishedRows(query);

  const { data, error } = await query;

  if (error) {
    throw new Error(`[sitemap] articles query: ${error.message}`);
  }

  const seen = new Set<string>();
  const rows: SitemapArticleRow[] = [];

  for (const row of data ?? []) {
    const slug = row.slug?.trim();
    if (!slug || seen.has(slug) || !row.published_at) continue;
    seen.add(slug);
    rows.push({
      slug,
      published_at: row.published_at,
      updated_at: row.updated_at ?? null,
    });
  }

  return rows;
}
