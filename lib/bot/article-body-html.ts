import type { ArticleBlock } from "@/lib/bot/seo-article-types";
import { stripArticleContentForPersist } from "@/lib/bot/strip-article-content";

const ALLOWED_INLINE_TAGS = /<\/?(strong|b|em)\b[^>]*>/gi;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineTextToHtml(text: string, preserveGeminiInlineTags: boolean): string {
  const trimmed = stripArticleContentForPersist(text.trim());
  if (!trimmed) return "";

  if (preserveGeminiInlineTags && ALLOWED_INLINE_TAGS.test(trimmed)) {
    return stripArticleContentForPersist(
      trimmed.replace(ALLOWED_INLINE_TAGS, (tag) => tag.toLowerCase()),
    );
  }
  const escaped = escapeHtml(trimmed);
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderBlock(block: ArticleBlock, preserveGeminiInlineTags: boolean): string {
  switch (block.type) {
    case "h2":
      return `<h2>${inlineTextToHtml(block.text, preserveGeminiInlineTags)}</h2>`;
    case "ul": {
      const items = block.items
        .filter((i) => i.trim().length > 0)
        .map((i) => `<li>${inlineTextToHtml(i, preserveGeminiInlineTags)}</li>`)
        .join("");
      return items ? `<ul>${items}</ul>` : "";
    }
    case "p":
    default:
      return block.text.trim()
        ? `<p>${inlineTextToHtml(block.text, preserveGeminiInlineTags)}</p>`
        : "";
  }
}

/** Gövdeden img / picture / figure kaldırır (kapak ayrı alanda). */
export function stripMediaFromArticleHtml(html: string): string {
  return stripArticleContentForPersist(html);
}

export type AssembleBodyOptions = {
  /** fetch-news: Gemini'den gelen <strong> vb. */
  preserveGeminiInlineTags?: boolean;
};

/** Yalnızca metin blokları (p, h2, ul, li, strong) — inline görsel yok. */
export function assembleArticleBodyHtml(
  blocks: ArticleBlock[],
  options: AssembleBodyOptions = {},
): string {
  const preserveGeminiInlineTags = options.preserveGeminiInlineTags ?? false;

  const validBlocks = blocks.filter((b) => {
    if (b.type === "ul") return b.items.some((i) => i.trim().length > 0);
    return "text" in b && b.text.trim().length > 0;
  });

  const parts = validBlocks
    .map((b) => renderBlock(b, preserveGeminiInlineTags))
    .filter((html) => html.length > 0);

  return stripMediaFromArticleHtml(parts.join("\n"));
}
