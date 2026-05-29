import { assembleArticleBodyHtml } from "@/lib/bot/article-body-html";
import type { ArticleBlock } from "@/lib/bot/seo-article-types";

/** Metin bloklarından HTML üretir; gövdeye görsel eklenmez (kapak ayrı). */
export function assembleFetchNewsHtml(blocks: ArticleBlock[]): {
  html: string;
  imagesUsed: number;
} {
  const html = assembleArticleBodyHtml(blocks, { preserveGeminiInlineTags: true });
  return { html, imagesUsed: 0 };
}
