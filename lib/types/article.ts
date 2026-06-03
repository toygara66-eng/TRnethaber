export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "twitter"; embedId: string }
  | { type: "youtube"; embedId: string };

export type ArticleDetail = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  /** Spot alanı — sanitize edilmiş HTML (detay sayfası) */
  spotHtml: string;
  category: string;
  categorySlug: string;
  readTimeLabel: string;
  /** Ön yüzde gösterilen maskelemiş kurumsal yazar adı */
  authorName: string;
  publishedAt: string;
  modifiedAt: string;
  imageSrc: string;
  imageAlt: string;
  metaDescription: string;
  seoKeywords: string[];
  /** Ham HTML içerik (TipTap editör çıktısı) */
  contentHtml: string;
  blocks: ArticleBlock[];
};
