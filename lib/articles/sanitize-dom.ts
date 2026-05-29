import { PLACEHOLDER_IMAGE, isAllowedCoverUrl } from "@/lib/images/cover";
import { isBlankValue } from "@/lib/safe-display";

function normalizeInlineImageSrc(src: string): string {
  let fixed = src.trim();
  if (fixed.startsWith("//")) fixed = `https:${fixed}`;
  if (isBlankValue(fixed) || !isAllowedCoverUrl(fixed)) {
    return PLACEHOLDER_IMAGE;
  }
  return fixed;
}

export function normalizeHtmlImages(html: string): string {
  return html.replace(
    /<img([^>]*?)\ssrc=["']([^"']*)["']([^>]*)>/gi,
    (_match, before, src, after) => {
      const normalized = normalizeInlineImageSrc(src);
      return `<img${before} src="${normalized}"${after}>`;
    },
  );
}

/** jsdom/DOMPurify gerektirmez — script/iframe vb. kaldırır */
export function stripDangerousHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

/**
 * Haber gövdesi HTML — yalnızca string işlemleri (SSR + istemci güvenli).
 * dangerouslySetInnerHTML ile kullanın; DOM parser yok.
 */
export function prepareArticleHtml(html: string): string {
  const trimmed = html?.trim() ?? "";
  if (!trimmed) return "";
  return normalizeHtmlImages(stripDangerousHtml(trimmed));
}

/** @deprecated prepareArticleHtml kullanın */
export async function sanitizeArticleHtml(html: string): Promise<string> {
  return prepareArticleHtml(html);
}
