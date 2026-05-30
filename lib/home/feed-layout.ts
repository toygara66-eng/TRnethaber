import {
  ALL_NAV_CATEGORY_ITEMS,
  HOME_VITRIN_SLUGS,
} from "@/lib/data/nav-categories";
import type { HomeCard } from "@/lib/types/home";

export const CARDS_PER_CATEGORY_BLOCK = 4;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...ALL_NAV_CATEGORY_ITEMS,
    { label: "Yerel", slug: "yerel-haberler" },
  ].map((item) => [item.slug, item.label]),
);

export type FeedCategorySection = {
  slug: string;
  label: string;
  cards: HomeCard[];
};

export type FeedDisplay = {
  latestPerCategory: HomeCard[];
  categoryBatches: FeedCategorySection[][];
};

function labelForSlug(slug: string, fallback?: string): string {
  return CATEGORY_LABELS[slug] ?? fallback ?? slug.replace(/-/g, " ");
}

function poolForCategory(
  cards: HomeCard[],
  slug: string,
  excludeIds: Set<string>,
): HomeCard[] {
  return cards.filter((c) => c.categorySlug === slug && !excludeIds.has(c.id));
}

export function buildFeedDisplay(
  cards: HomeCard[],
  excludeIds: Set<string>,
  categoryOrder: string[] = HOME_VITRIN_SLUGS,
): FeedDisplay {
  const latestPerCategory: HomeCard[] = [];

  for (const slug of categoryOrder) {
    const pool = poolForCategory(cards, slug, excludeIds);
    if (pool.length > 0) {
      latestPerCategory.push(pool[0]);
    }
  }

  const categoryBatches: FeedCategorySection[][] = [];
  let batchIndex = 0;

  while (batchIndex < 12) {
    const batch: FeedCategorySection[] = [];

    for (const slug of categoryOrder) {
      const pool = poolForCategory(cards, slug, excludeIds);
      const start = 1 + batchIndex * CARDS_PER_CATEGORY_BLOCK;
      const sectionCards = pool.slice(start, start + CARDS_PER_CATEGORY_BLOCK);
      if (sectionCards.length === 0) continue;

      batch.push({
        slug,
        label: labelForSlug(slug, pool[0]?.category),
        cards: sectionCards,
      });
    }

    if (batch.length === 0) break;
    categoryBatches.push(batch);
    batchIndex += 1;
  }

  return { latestPerCategory, categoryBatches };
}
