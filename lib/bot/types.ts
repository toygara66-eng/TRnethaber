import type { RssCategoryKey } from "@/lib/bot/rss-feed-pool";

export type ArticleCategorySlug = RssCategoryKey;

export type AgencyWire = {
  id: string;
  categorySlug: ArticleCategorySlug;
  isBreaking: boolean;
  rawTitle: string;
  rawLead: string;
  rawBody: string;
  sourceLabel: string;
  sourceUrl?: string;
  /** og:image veya birincil RSS görseli */
  imageUrl?: string;
  /** Sayfa içinden kazınan ek görseller */
  imageUrls?: string[];
};

export type EntityType = "kisi" | "takim" | "kurum";

export type ExtractedEntity = {
  name: string;
  slug: string;
  entity_type: EntityType;
  bio_content: string;
  anlik_durum_neden_gundemde: string;
  image_url: string | null;
};

export type EntityUpsertResult = {
  slug: string;
  name: string;
  action: "inserted" | "updated";
};
