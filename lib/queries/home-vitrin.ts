import { filterPublishedRows, isRowPublished } from "@/lib/articles/publish";
import { isMissingMansetColumn } from "@/lib/articles/manset-db";
import { coerceViewCount } from "@/lib/articles/view-count-db";
import { normalizeHomeCard } from "@/lib/articles/list-card";
import { safeSlug, safeText } from "@/lib/safe-display";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow } from "@/lib/supabase/rows";
import type { HomeCard, HomeHeroSlide } from "@/lib/types/home";

const VITRIN_SELECT_WITH_FLAGS = `
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
    const plain = await filterPublishedRows(
      supabase.from("articles").select(
        `
        id,
        title,
        slug,
        spot_metni,
        kapak_gorseli,
        published_at,
        category_id,
        categories ( slug, name )
      `,
      ),
    )
      .order("published_at", { ascending: false })
      .limit(limit);

    if (plain.error) {
      console.error("[getHomeVitrin] fallback plain:", plain.error);
      return [];
    }
    return publishedRows(plain.data);
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

export async function getHomeVitrin(): Promise<HomeVitrinPayload> {
  let heroSlides: HomeHeroSlide[] = [];
  let topHeadlineCards: HomeCard[] = [];
  let mansetQueryFailed = false;

  try {
    const supabase = createSupabaseClient();

    const [heroRes, topRes] = await Promise.all([
      filterPublishedRows(
        supabase.from("articles").select(VITRIN_SELECT_WITH_FLAGS).eq("is_ust_manset", true),
      )
        .order("published_at", { ascending: false })
        .limit(6),
      filterPublishedRows(
        supabase.from("articles").select(VITRIN_SELECT_WITH_FLAGS).eq("is_manset", true),
      )
        .order("published_at", { ascending: false })
        .limit(8),
    ]);

    const heroErr = heroRes.error?.message ?? "";
    const topErr = topRes.error?.message ?? "";

    if (isMissingMansetColumn(heroErr) || isMissingMansetColumn(topErr)) {
      mansetQueryFailed = true;
      console.warn("[getHomeVitrin] manşet sütunları yok, son haberler kullanılacak");
    } else {
      if (heroRes.error) {
        mansetQueryFailed = true;
        console.error("[getHomeVitrin] üst manşet:", heroRes.error);
      } else {
        heroSlides = publishedRows(heroRes.data).map(toHeroSlide);
      }

      if (topRes.error) {
        mansetQueryFailed = true;
        console.error("[getHomeVitrin] manşet:", topRes.error);
      } else {
        topHeadlineCards = publishedRows(topRes.data).map(toHomeCard);
      }
    }
  } catch (err) {
    mansetQueryFailed = true;
    console.error("[getHomeVitrin] exception:", err);
  }

  const needsFallback =
    mansetQueryFailed || heroSlides.length === 0 || topHeadlineCards.length === 0;

  if (needsFallback) {
    const latest = await fetchLatestPublished(FALLBACK_LIMIT);
    const filled = applyVitrinFallback(heroSlides, topHeadlineCards, latest);
    return {
      heroSlides: filled.heroSlides,
      topHeadlineCards: filled.topHeadlineCards,
      usedFallback: filled.usedFallback || mansetQueryFailed,
    };
  }

  return { heroSlides, topHeadlineCards, usedFallback: false };
}
