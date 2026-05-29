import { assembleArticleBodyHtml } from "@/lib/bot/article-body-html";
import type { ArticleBlock } from "@/lib/bot/seo-article-types";

export type AssembleResult = {
  html: string;
  imagesUsed: number;
};

/** Metin bloklarından HTML üretir; gövdeye görsel eklenmez (kapak ayrı). */
export function assembleArticleHtml(blocks: ArticleBlock[]): AssembleResult {
  const html = assembleArticleBodyHtml(blocks);
  return { html, imagesUsed: 0 };
}
