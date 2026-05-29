import type { ArticleBlock } from "@/lib/bot/seo-article-types";
import { MIN_H2_BLOCKS, MIN_INLINE_IMAGES } from "@/lib/bot/seo-article-types";
import { coverImageAlt } from "@/lib/bot/cover-image";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** **kalın** → <strong> */
function inlineTextToHtml(text: string): string {
  const escaped = escapeHtml(text.trim());
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderBlock(block: ArticleBlock): string {
  switch (block.type) {
    case "h2":
      return `<h2>${inlineTextToHtml(block.text)}</h2>`;
    case "ul": {
      const items = block.items
        .filter((i) => i.trim().length > 0)
        .map((i) => `<li>${inlineTextToHtml(i)}</li>`)
        .join("");
      return items ? `<ul>${items}</ul>` : "";
    }
    case "p":
    default:
      return block.text.trim() ? `<p>${inlineTextToHtml(block.text)}</p>` : "";
  }
}

function renderFigure(url: string, alt: string): string {
  const safeUrl = escapeHtml(url);
  const safeAlt = escapeHtml(alt);
  return `<figure class="article-inline-image my-6"><img src="${safeUrl}" alt="${safeAlt}" loading="lazy" class="max-w-full rounded-lg" /></figure>`;
}

/** p/ul ile h2 arasına görsel yerleştirme noktaları (h2 indeksi) */
function primaryInsertionIndices(blocks: ArticleBlock[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type !== "h2" || i === 0) continue;
    const prev = blocks[i - 1];
    if (prev.type === "p" || prev.type === "ul") {
      indices.push(i);
    }
  }
  return indices;
}

/** Ek slotlar: h2 sonrası ilk p'den önce (üst üste görsel yok) */
function secondaryInsertionIndices(
  blocks: ArticleBlock[],
  used: Set<number>,
  need: number,
): number[] {
  const extra: number[] = [];
  for (let i = 0; i < blocks.length - 1 && extra.length < need; i++) {
    if (used.has(i) || used.has(i + 1)) continue;
    const cur = blocks[i];
    const next = blocks[i + 1];
    if (cur.type === "h2" && next.type === "p") {
      extra.push(i + 1);
      used.add(i + 1);
    }
  }
  return extra;
}

export type AssembleResult = {
  html: string;
  imagesUsed: number;
};

/**
 * UX kuralı: min 3 inline görsel; asla ardışık; p…p → IMG → h2 → p…p
 */
export function assembleArticleHtml(
  blocks: ArticleBlock[],
  imageUrls: string[],
  title: string,
): AssembleResult {
  const validBlocks = blocks.filter((b) => {
    if (b.type === "ul") return b.items.some((i) => i.trim().length > 0);
    return "text" in b && b.text.trim().length > 0;
  });

  const h2Count = validBlocks.filter((b) => b.type === "h2").length;
  if (h2Count < MIN_H2_BLOCKS) {
    console.warn(`[assembler] H2 sayısı düşük (${h2Count}), görseller sınırlı yerleşebilir`);
  }

  const primary = primaryInsertionIndices(validBlocks);
  const usedSlots = new Set(primary);
  let insertions = [...primary];

  if (insertions.length < MIN_INLINE_IMAGES) {
    insertions = [
      ...insertions,
      ...secondaryInsertionIndices(
        validBlocks,
        usedSlots,
        MIN_INLINE_IMAGES - insertions.length,
      ),
    ];
  }

  insertions = Array.from(new Set(insertions))
    .sort((a, b) => a - b)
    .slice(0, imageUrls.length);
  const insertionSet = new Set(insertions);

  const alt = coverImageAlt(title);
  const parts: string[] = [];
  let imageIndex = 0;
  let lastWasImage = false;

  for (let i = 0; i < validBlocks.length; i++) {
    if (insertionSet.has(i) && imageIndex < imageUrls.length && !lastWasImage) {
      parts.push(renderFigure(imageUrls[imageIndex], alt));
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
      parts.push(renderFigure(url, alt));
    }
    imageIndex += 1;
  }

  return {
    html: parts.join("\n"),
    imagesUsed: imageIndex,
  };
}
