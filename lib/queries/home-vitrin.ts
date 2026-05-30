import { filterPublishedRows, isRowPublished } from "@/lib/articles/publish";
import { isMissingMansetColumn } from "@/lib/articles/manset-db";
import { coerceViewCount } from "@/lib/articles/view-count-db";
import { normalizeHomeCard } from "@/lib/articles/list-card";
import { safeSlug, safeText } from "@/lib/safe-display";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow } from "@/lib/supabase/rows";
import type { HomeCard, HomeHeroSlide } from "@/lib/types/home";

const VITRIN_SELECT = `
  id,
  title,
  slug,
  spot_metni,
  kapak_gorseli,
  view_count,
  published_at,
  is_manset,
  is_ust_manset,
  category_id,
  categories ( slug, name )
`;

function resolveCategory(row: ArticleRow) {
  const c = row.categories;
  if (!c) return null;
  return Array.isArray(c) ? c[0] ?? null : c;
}

function coverAlt(title: string): string {
  return `${safeText(title, "Haber")} kapak görseli`;
}

function toHomeCard(row: ArticleRow): HomeCard {
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
    imageAlt: coverAlt(title),
    hasCoverImage: Boolean(row.kapak_gorseli?.trim()),
  });
}

function toHeroSlide(row: ArticleRow): HomeHeroSlide {
  const card = toHomeCard(row);
  return {
    id: card.id,
    slug: card.slug,
    title: card.title,
    dek: safeText(row.spot_metni),
    category: card.category,
    imageSrc: card.imageSrc,
    imageAlt: card.imageAlt,
  };
}

export type HomeVitrinPayload = {
  heroSlides: HomeHeroSlide[];
  topHeadlineCards: HomeCard[];
};

export async function getHomeVitrin(): Promise<HomeVitrinPayload> {
  const empty: HomeVitrinPayload = { heroSlides: [], topHeadlineCards: [] };

  try {
    const supabase = createSupabaseClient();

    const [heroRes, topRes] = await Promise.all([
      filterPublishedRows(
        supabase.from("articles").select(VITRIN_SELECT).eq("is_ust_manset", true),
      )
        .order("published_at", { ascending: false })
        .limit(6),
      filterPublishedRows(
        supabase.from("articles").select(VITRIN_SELECT).eq("is_manset", true),
      )
        .order("published_at", { ascending: false })
        .limit(8),
    ]);

    const heroErr = heroRes.error?.message ?? "";
    const topErr = topRes.error?.message ?? "";
    if (isMissingMansetColumn(heroErr) || isMissingMansetColumn(topErr)) {
      return empty;
    }

    if (heroRes.error || topRes.error) {
      console.error("[getHomeVitrin]", heroRes.error ?? topRes.error);
      return empty;
    }

    const heroRows = ((heroRes.data ?? []) as ArticleRow[]).filter((r) => isRowPublished(r));
    const topRows = ((topRes.data ?? []) as ArticleRow[]).filter((r) => isRowPublished(r));

    return {
      heroSlides: heroRows.map(toHeroSlide),
      topHeadlineCards: topRows.map(toHomeCard),
    };
  } catch (err) {
    console.error("[getHomeVitrin]", err);
    return empty;
  }
}
