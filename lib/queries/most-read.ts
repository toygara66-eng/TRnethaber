import { filterPublishedRows, isRowPublished } from "@/lib/articles/publish";
import { isMissingViewCountColumn, coerceViewCount } from "@/lib/articles/view-count-db";
import { normalizeHomeCard } from "@/lib/articles/list-card";
import { safeSlug, safeText } from "@/lib/safe-display";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow } from "@/lib/supabase/rows";
import type { HomeCard } from "@/lib/types/home";

const MOST_READ_SELECT = `
  id,
  title,
  slug,
  spot_metni,
  kapak_gorseli,
  view_count,
  published_at,
  category_id,
  categories ( slug, name )
`;

function resolveCategory(row: ArticleRow) {
  const c = row.categories;
  if (!c) return null;
  return Array.isArray(c) ? c[0] ?? null : c;
}

function toMostReadCard(row: ArticleRow): HomeCard {
  const cat = resolveCategory(row);
  const title = safeText(row.title, "Haber");
  return normalizeHomeCard({
    id: safeText(row.id, row.slug ?? "card"),
    slug: safeSlug(row.slug, "haber"),
    title,
    dek: safeText(row.spot_metni),
    category: safeText(cat?.name, "Gündem"),
    categorySlug: safeText(cat?.slug, "gundem"),
    viewCount: coerceViewCount((row as ArticleRow & { view_count?: unknown }).view_count),
    imageSrc: resolveCoverImageSrc(row.kapak_gorseli),
    imageAlt: `${title} kapak görseli`,
    hasCoverImage: Boolean(row.kapak_gorseli?.trim()),
  });
}

/** En yüksek view_count değerine göre yayınlanmış haberler (ön yüz widget). */
export async function getMostReadHomeCards(limit = 2): Promise<HomeCard[]> {
  try {
    const supabase = createSupabaseClient();

    const primary = await filterPublishedRows(
      supabase.from("articles").select(MOST_READ_SELECT),
    )
      .order("view_count", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(limit * 3);

    if (primary.error && isMissingViewCountColumn(primary.error.message)) {
      return [];
    }

    let rows: ArticleRow[] = [];

    if (!primary.error && primary.data) {
      rows = (primary.data as unknown as ArticleRow[]).filter((r) => isRowPublished(r));
    } else {
      console.error("[getMostReadHomeCards]", primary.error);
      return [];
    }
    const cards = rows.map(toMostReadCard);

    return cards
      .sort(
        (a, b) =>
          b.viewCount - a.viewCount || Number(b.hasCoverImage) - Number(a.hasCoverImage),
      )
      .slice(0, limit);
  } catch (err) {
    console.error("[getMostReadHomeCards]", err);
    return [];
  }
}
