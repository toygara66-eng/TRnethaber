import { filterPublishedRows, isRowPublished } from "@/lib/articles/publish";
import { isMissingHeadlineColumn } from "@/lib/articles/headline-automation";
import { coerceViewCount } from "@/lib/articles/view-count-db";
import { normalizeHomeCard } from "@/lib/articles/list-card";
import { safeSlug, safeText } from "@/lib/safe-display";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow } from "@/lib/supabase/rows";
import { normalizeArticleSpotSummary } from "@/lib/articles/summary-text";
import type { HomeCard, HomeHeroSlide } from "@/lib/types/home";

const VITRIN_SELECT = `
  id,
  title,
  slug,
  spot_metni,
  kapak_gorseli,
  view_count,
  published_at,
  is_headline,
  is_top_headline,
  is_manset,
  is_ust_manset,
  category_id,
  categories ( slug, name )
`;

const VITRIN_SELECT_SAFE = `
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

const FALLBACK_LIMIT = 10;

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
    dek: normalizeArticleSpotSummary(safeText(row.spot_metni), ""),
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
    dek: card.dek,
    category: card.category,
    imageSrc: card.imageSrc,
    imageAlt: card.imageAlt,
  };
}

function publishedRows(data: unknown): ArticleRow[] {
  return ((data ?? []) as ArticleRow[]).filter((r) => isRowPublished(r));
}

export type HomeVitrinPayload = {
  heroSlides: HomeHeroSlide[];
  topHeadlineCards: HomeCard[];
  usedFallback: boolean;
};

async function fetchLatestPublished(limit: number): Promise<ArticleRow[]> {
  const supabase = createSupabaseClient();

  const res = await filterPublishedRows(
    supabase.from("articles").select(VITRIN_SELECT_SAFE),
  )
    .order("published_at", { ascending: false })
    .limit(limit);

  if (res.error) {
    console.error("[getHomeVitrin] fallback latest:", res.error);
    return [];
  }

  return publishedRows(res.data);
}

function applyVitrinFallback(
  heroSlides: HomeHeroSlide[],
  topHeadlineCards: HomeCard[],
  latest: ArticleRow[],
): { heroSlides: HomeHeroSlide[]; topHeadlineCards: HomeCard[]; usedFallback: boolean } {
  if (latest.length === 0) {
    return { heroSlides, topHeadlineCards, usedFallback: false };
  }

  let usedFallback = false;
  let nextHero = heroSlides;
  let nextTop = topHeadlineCards;

  if (nextHero.length === 0) {
    const withCover = latest.filter((r) => Boolean(r.kapak_gorseli?.trim()));
    const pool = withCover.length > 0 ? withCover : latest;
    nextHero = pool.slice(0, 3).map(toHeroSlide);
    usedFallback = true;
  }

  if (nextTop.length === 0) {
    const heroIds = new Set(nextHero.map((s) => s.id));
    const pool = latest.filter((r) => !heroIds.has(r.id));
    nextTop = (pool.length > 0 ? pool : latest).slice(0, 4).map(toHomeCard);
    usedFallback = true;
  }

  return { heroSlides: nextHero, topHeadlineCards: nextTop, usedFallback };
}

async function fetchHeadlineRows(
  column: "is_headline" | "is_top_headline",
  limit: number,
): Promise<{ rows: ArticleRow[]; failed: boolean }> {
  const supabase = createSupabaseClient();
  const res = await filterPublishedRows(
    supabase.from("articles").select(VITRIN_SELECT).eq(column, true),
  )
    .order("published_at", { ascending: false })
    .limit(limit);

  if (res.error?.message && isMissingHeadlineColumn(res.error.message)) {
    const legacyCol = column === "is_headline" ? "is_ust_manset" : "is_manset";
    const legacy = await filterPublishedRows(
      supabase.from("articles").select(VITRIN_SELECT_SAFE).eq(legacyCol, true),
    )
      .order("published_at", { ascending: false })
      .limit(limit);
    if (legacy.error) {
      console.error(`[getHomeVitrin] legacy ${legacyCol}:`, legacy.error);
      return { rows: [], failed: true };
    }
    return { rows: publishedRows(legacy.data), failed: false };
  }

  if (res.error) {
    console.error(`[getHomeVitrin] ${column}:`, res.error);
    return { rows: [], failed: true };
  }

  return { rows: publishedRows(res.data), failed: false };
}

export async function getHomeVitrin(): Promise<HomeVitrinPayload> {
  let heroSlides: HomeHeroSlide[] = [];
  let topHeadlineCards: HomeCard[] = [];
  let queryFailed = false;

  try {
    const [heroRes, topRes] = await Promise.all([
      fetchHeadlineRows("is_headline", 6),
      fetchHeadlineRows("is_top_headline", 4),
    ]);

    if (heroRes.failed || topRes.failed) queryFailed = true;
    heroSlides = heroRes.rows.map(toHeroSlide);
    topHeadlineCards = topRes.rows.map(toHomeCard);
  } catch (err) {
    queryFailed = true;
    console.error("[getHomeVitrin] exception:", err);
  }

  const needsFallback =
    queryFailed || heroSlides.length === 0 || topHeadlineCards.length === 0;

  if (needsFallback) {
    const latest = await fetchLatestPublished(FALLBACK_LIMIT);
    const filled = applyVitrinFallback(heroSlides, topHeadlineCards, latest);
    return {
      heroSlides: filled.heroSlides,
      topHeadlineCards: filled.topHeadlineCards,
      usedFallback: filled.usedFallback || queryFailed,
    };
  }

  return { heroSlides, topHeadlineCards, usedFallback: false };
}
