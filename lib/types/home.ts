export type HomeHeroSlide = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: string;
  imageSrc: string;
  imageAlt: string;
};

export type HomeCard = {
  id: string;
  slug: string;
  title: string;
  category: string;
  readCountLabel: string;
  imageSrc: string;
  imageAlt: string;
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
