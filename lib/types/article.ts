export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "twitter"; embedId: string }
  | { type: "youtube"; embedId: string };

export type ArticleDetail = {
  slug: string;
  title: string;
  dek: string;
  category: string;
  categorySlug: string;
  readTimeLabel: string;
  viewCountLabel: string;
  authorName: string;
  publishedAt: string;
  modifiedAt: string;
  imageSrc: string;
  imageAlt: string;
  metaDescription: string;
  seoKeywords: string[];
  blocks: ArticleBlock[];
};
