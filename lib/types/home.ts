export type HomeHeroSlide = {
  id: string;
  slug: string;
  title: string;
  category: string;
  imageSrc: string;
  imageAlt: string;
};

export type HomeCard = {
  id: string;
  slug: string;
  title: string;
  /** Spot özet (spot_metni) — kartlarda line-clamp ile gösterilir */
  dek?: string;
  category: string;
  categorySlug: string;
  /** Gerçek DB view_count — yalnızca sıralama; ön yüzde gösterilmez */
  viewCount: number;
  imageSrc: string;
  imageAlt: string;
  /** Gerçek kapak_gorseli yüklü mü (yedek Picsum değil) */
  hasCoverImage: boolean;
};

export type CategorySection = {
  slug: string;
  label: string;
  cards: HomeCard[];
};

export type HomePageData = {
  breakingTicker: string[];
  heroSlides: HomeHeroSlide[];
  categorySections: CategorySection[];
};
