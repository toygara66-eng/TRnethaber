import type { ArticleBlock } from "@/lib/bot/seo-article-types";
import { MIN_INLINE_IMAGES } from "@/lib/bot/seo-article-types";
import { coverImageAlt } from "@/lib/bot/cover-image";

const ALLOWED_INLINE_TAGS = /<\/?(strong|b|em)\b[^>]*>/gi;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Gemini <strong> veya **kalın** */
function inlineToHtml(text: string): string {
  const trimmed = text.trim();
  if (ALLOWED_INLINE_TAGS.test(trimmed)) {
    return trimmed.replace(ALLOWED_INLINE_TAGS, (tag) => tag.toLowerCase());
  }
  const escaped = escapeHtml(trimmed);
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderBlock(block: ArticleBlock): string {
  switch (block.type) {
    case "h2":
      return `<h2>${inlineToHtml(block.text)}</h2>`;
    case "ul": {
      const items = block.items
        .filter((i) => i.trim().length > 0)
        .map((i) => `<li>${inlineToHtml(i)}</li>`)
        .join("");
      return items ? `<ul>${items}</ul>` : "";
    }
    case "p":
    default:
      return block.text.trim() ? `<p>${inlineToHtml(block.text)}</p>` : "";
  }
}

function renderInlineImage(url: string, alt: string): string {
  const safeUrl = escapeHtml(url);
  const safeAlt = escapeHtml(alt);
  return `<img src="${safeUrl}" alt="${safeAlt}" class="w-full rounded-lg my-4" loading="lazy" />`;
}

/** p/ul bitti → h2 başlamadan önce görsel (P → IMG → H2 → P) */
function insertionBeforeH2(blocks: ArticleBlock[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type !== "h2" || i === 0) continue;
    const prev = blocks[i - 1];
    if (prev.type === "p" || prev.type === "ul") indices.push(i);
  }
  return indices;
}

export function assembleFetchNewsHtml(
  blocks: ArticleBlock[],
  imageUrls: string[],
  title: string,
): { html: string; imagesUsed: number } {
  const validBlocks = blocks.filter((b) => {
    if (b.type === "ul") return b.items.some((i) => i.trim().length > 0);
    return b.text.trim().length > 0;
  });

  const slots = insertionBeforeH2(validBlocks).slice(0, imageUrls.length);
  const slotSet = new Set(slots);
  const alt = coverImageAlt(title);

  const parts: string[] = [];
  let imageIndex = 0;
  let lastWasImage = false;

  for (let i = 0; i < validBlocks.length; i++) {
    if (slotSet.has(i) && imageIndex < imageUrls.length && !lastWasImage) {
      parts.push(renderInlineImage(imageUrls[imageIndex], alt));
      imageIndex += 1;
      lastWasImage = true;
    } else {
      lastWasImage = false;
    }

    const html = renderBlock(validBlocks[i]);
    if (html) {
      parts.push(html);
      lastWasImage = false;
    }
  }

  while (imageIndex < MIN_INLINE_IMAGES && imageIndex < imageUrls.length) {
    const url = imageUrls[imageIndex];
    if (!parts.some((p) => p.includes(url))) {
      parts.push(renderInlineImage(url, alt));
    }
    imageIndex += 1;
  }

  return { html: parts.join("\n"), imagesUsed: imageIndex };
}
