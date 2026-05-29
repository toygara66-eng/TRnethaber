import { filterPublishedRows } from "@/lib/articles/publish";
import { createSupabaseClient } from "@/lib/supabase";

export type SitemapArticleRow = {
  slug: string;
  published_at: string;
};

const PAGE_SIZE = 500;
const MAX_URLS = 5_000;

/**
 * Yayında olan haberler: published_at dolu ve published_at <= şimdi.
 */
export async function fetchPublishedArticlesForSitemap(): Promise<SitemapArticleRow[]> {
  const supabase = createSupabaseClient();
  const collected: SitemapArticleRow[] = [];
  const seen = new Set<string>();
  let from = 0;

  while (collected.length < MAX_URLS) {
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("articles")
      .select("slug, published_at")
      .order("published_at", { ascending: false })
      .range(from, to);

    query = filterPublishedRows(query);

    const { data, error } = await query;

    if (error) {
      console.warn("[sitemap] articles query:", error.message);
      break;
    }

    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const slug = row.slug?.trim();
      if (!slug || seen.has(slug) || !row.published_at) continue;
      seen.add(slug);
      collected.push({ slug, published_at: row.published_at });
      if (collected.length >= MAX_URLS) break;
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return collected;
}
