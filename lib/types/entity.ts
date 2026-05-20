export type EntityType = "kisi" | "takim" | "kurum";

export type EntityDetail = {
  slug: string;
  name: string;
  entityType: EntityType;
  entityTypeLabel: string;
  bioContent: string;
  spotlightReason: string | null;
  imageSrc: string;
  imageAlt: string;
};

export type EntityRelatedCard = {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  imageSrc: string;
  imageAlt: string;
  readCountLabel: string;
};
