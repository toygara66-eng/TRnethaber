/** RSS / kaynak sayfası görsel kazıma — og:image öncelikli, article içi, anti-logo */

import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";

const JUNK_URL_PATTERN =
  /(?:^|[\/_-])(?:logo|logotype|brand(?:-?mark)?|site-?logo|header-?logo|footer-?logo|icon|favicon|avatar|profile-?pic|user-?pic|sponsor(?:ed)?|advert|ads?|banner|watermark|placeholder|spacer|pixel|tracking|analytics|emoji|badge|sprite|default-?image|no-?image|share-?image|weather|hava-?durumu|meteo|wticon|son-?dakika|breaking-?logo|flaş|flash)(?:[\/_.-]|$)/i;

const JUNK_EXT_PATTERN = /\.(?:svg|ico|gif|avif)(\?|#|$)/i;

const TINY_DIMENSION_PATTERN = /(?:[?&](?:w|width|h|height)=)(?:1?\d{1,2}|[1-9])(?:&|$)/i;

export function isJunkImageUrl(src: string): boolean {
  const lower = src.trim().toLowerCase();
  if (!lower || lower.startsWith("data:")) return true;
  if (JUNK_EXT_PATTERN.test(lower)) return true;
  if (JUNK_URL_PATTERN.test(lower)) return true;
  if (TINY_DIMENSION_PATTERN.test(lower)) return true;
  if (/\b1x1\b|spacer|blank\.(?:png|gif|jpg)/i.test(lower)) return true;
  return false;
}

/** Göreli URL → mutlak */
export function resolveScrapeImageUrl(src: string, pageUrl?: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || isJunkImageUrl(trimmed)) return null;

  try {
    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    if (pageUrl) {
      return new URL(trimmed, pageUrl).href;
    }
  } catch {
    return null;
  }
  return null;
}

function readImgSrc($: CheerioAPI, el: Cheerio<AnyNode>): string | null {
  const attrs = ["src", "data-src", "data-lazy-src", "data-original", "data-lazy"];
  for (const name of attrs) {
    const val = el.attr(name);
    if (val?.trim()) return val.trim();
  }
  const srcset = el.attr("srcset");
  if (srcset) {
    const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
    if (first) return first;
  }
  return null;
}

function imagePixelScore($: CheerioAPI, el: Cheerio<AnyNode>): number {
  const w = Number.parseInt(el.attr("width") ?? "", 10);
  const h = Number.parseInt(el.attr("height") ?? "", 10);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return w * h;
  }

  const cls = `${el.attr("class") ?? ""} ${el.attr("id") ?? ""}`.toLowerCase();
  if (/(?:hero|featured|cover|kapak|lead|main|buyuk|large)/i.test(cls)) return 500_000;

  const src = readImgSrc($, el) ?? "";
  const dimMatch = src.match(/(\d{3,4})x(\d{3,4})/);
  if (dimMatch) {
    return Number.parseInt(dimMatch[1], 10) * Number.parseInt(dimMatch[2], 10);
  }

  return 10_000;
}

export function extractOgImageFromHtml(html: string, pageUrl?: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];

  for (const re of patterns) {
    const match = html.match(re);
    const resolved = match?.[1] ? resolveScrapeImageUrl(match[1], pageUrl) : null;
    if (resolved && !isJunkImageUrl(resolved)) return resolved;
  }
  return null;
}

/** @deprecated extractOgImageFromHtml */
function extractOgImage(html: string, pageUrl?: string): string | null {
  return extractOgImageFromHtml(html, pageUrl);
}

function extractImgTagsFromHtml(html: string, pageUrl?: string): string[] {
  const urls: string[] = [];
  const imgRegex = /<img[^>]+>/gi;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = imgRegex.exec(html)) !== null) {
    const tag = tagMatch[0];
    const srcMatch =
      tag.match(/\ssrc=["']([^"']+)["']/i) ||
      tag.match(/\sdata-src=["']([^"']+)["']/i) ||
      tag.match(/\sdata-lazy-src=["']([^"']+)["']/i);

    const src = srcMatch?.[1];
    if (!src) continue;

    const resolved = resolveScrapeImageUrl(src, pageUrl);
    if (!resolved || isJunkImageUrl(resolved)) continue;
    if (!urls.includes(resolved)) urls.push(resolved);
    if (urls.length >= 12) break;
  }

  return urls;
}

/**
 * og:image → article içindeki en büyük görsel → (yedek) filtrelenmiş sayfa img.
 */
export function extractArticleImagesFromRoot(
  $article: CheerioAPI,
  fullHtml: string,
  pageUrl?: string,
): string[] {
  const ordered: string[] = [];

  const og = extractOgImageFromHtml(fullHtml, pageUrl);
  if (og) ordered.push(og);

  let bestUrl: string | null = null;
  let bestScore = 0;
  $article("img").each((_, node) => {
    const el = $article(node);
    const raw = readImgSrc($article, el);
    if (!raw) return;

    const resolved = resolveScrapeImageUrl(raw, pageUrl);
    if (!resolved || isJunkImageUrl(resolved)) return;

    const score = imagePixelScore($article, el);
    if (score > bestScore) {
      bestScore = score;
      bestUrl = resolved;
    }
  });

  if (bestUrl && !ordered.includes(bestUrl)) ordered.push(bestUrl);

  const fragmentHtml = $article.root().html() ?? "";
  for (const url of extractImgTagsFromHtml(fragmentHtml, pageUrl)) {
    if (!ordered.includes(url)) ordered.push(url);
  }

  if (ordered.length === 0) {
    for (const url of extractImgTagsFromHtml(fullHtml, pageUrl)) {
      if (!ordered.includes(url)) ordered.push(url);
    }
  }

  return ordered;
}

/**
 * og:image önce, sonra article içi en büyük görsel, sonra filtrelenmiş img.
 */
export function extractArticleImagesFromHtml(html: string, pageUrl?: string): string[] {
  const og = extractOgImage(html, pageUrl);
  if (og) {
    const rest = extractImgTagsFromHtml(html, pageUrl).filter((u) => u !== og);
    return [og, ...rest];
  }
  return extractImgTagsFromHtml(html, pageUrl);
}
