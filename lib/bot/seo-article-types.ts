/** Gemini SEO JSON çıktısı — HTML değil, blok tabanlı yapı */
export type ArticleBlockType = "p" | "h2" | "ul";

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export type SeoArticleGeminiJson = {
  title: string;
  keywords: string[];
  summary: string;
  blocks: ArticleBlock[];
};

/** @deprecated Gövdeye inline görsel eklenmiyor; yalnızca kapak kullanılır. */
export const MIN_INLINE_IMAGES = 0;
export const MIN_H2_BLOCKS = 3;
