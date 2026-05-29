/**
 * Kaynak haber sayfası — cheerio ile hedefli kazıma.
 * article / main / .post-content odaklı; gürültü DOM'dan silinir.
 */

import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { extractArticleImagesFromRoot } from "@/lib/bot/scrape-images";

/** Kazımadan önce DOM'dan tamamen kaldırılacak bölgeler */
const NOISE_REMOVE_SELECTORS = [
  "header",
  "footer",
  "nav",
  "aside",
  "form",
  "script",
  "style",
  "noscript",
  "iframe",
  ".comments",
  ".comment",
  ".comment-list",
  ".comment-form",
  "#comments",
  "#yorumlar",
  ".yorum",
  ".yorumlar",
  ".widget",
  ".widgets",
  ".sidebar",
  ".side-bar",
  ".side",
  ".menu",
  ".navbar",
  ".nav",
  ".breadcrumb",
  ".breadcrumbs",
  ".related",
  ".related-posts",
  ".benzer-haberler",
  ".social-share",
  ".share-buttons",
  ".cookie",
  ".cookies",
  ".gdpr",
  ".kvkk",
  ".weather",
  ".hava-durumu",
  ".breaking-ticker",
  ".son-dakika-bar",
  "[class*='comment']",
  "[id*='comment']",
  "[class*='sidebar']",
  "[id*='sidebar']",
  "[class*='widget']",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
  "[role='complementary']",
];

/** Haber gövdesi için öncelik sırası (ilk anlamlı eşleşme) */
const ARTICLE_ROOT_SELECTORS = [
  "article",
  "main article",
  "[role='main'] article",
  "main",
  "[role='main']",
  ".post-content",
  ".entry-content",
  ".article-content",
  ".article-body",
  ".news-content",
  ".haber-icerik",
  ".haber-detay",
  ".detail-content",
  ".story-body",
  "#article-body",
  "#haber-metni",
  ".content-body",
];

/** Paragraf metninde atlanacak UI / yorum / çerez kalıpları */
const JUNK_TEXT_PATTERNS = [
  /yorumunuz\s+başarıyla/i,
  /yorumunuz\s+(?:alındı|yayınlandı|gönderildi)/i,
  /çerez\s+politik/i,
  /kvkk/i,
  /gizlilik\s+politik/i,
  /abone\s+olun/i,
  /bültene\s+kaydol/i,
  /giriş\s+yapın/i,
  /üye\s+olun/i,
  /son\s+dakika\s+(?:bandı|ticker)/i,
  /hava\s+durumu/i,
  /°c|°f/i,
];

function loadCleanedArticleRoot($: CheerioAPI, root: Cheerio<AnyNode>): CheerioAPI {
  const rootHtml = $.html(root) || "<div></div>";
  const $article = cheerio.load(rootHtml);

  for (const sel of NOISE_REMOVE_SELECTORS) {
    $article(sel).remove();
  }

  return $article;
}

function scoreArticleRoot($: CheerioAPI, el: Cheerio<AnyNode>): number {
  const text = el.text().replace(/\s+/g, " ").trim();
  const pCount = el.find("p").length;
  const len = text.length;
  if (len < 120) return 0;
  return len + pCount * 80;
}

function findArticleRoot($: CheerioAPI): Cheerio<AnyNode> {
  let best: Cheerio<AnyNode> | null = null;
  let bestScore = 0;

  for (const sel of ARTICLE_ROOT_SELECTORS) {
    $(sel).each((_, node) => {
      const el = $(node);
      const score = scoreArticleRoot($, el);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    });
    if (best && bestScore > 600) break;
  }

  if (best && bestScore > 0) return best;

  const body = $("body");
  return body.length ? body : $.root();
}

function isJunkParagraph(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 40) return true;
  if (JUNK_TEXT_PATTERNS.some((re) => re.test(t))) return true;
  return false;
}

function extractParagraphText($article: CheerioAPI): string {
  const parts: string[] = [];

  $article("p").each((_, node) => {
    const text = $article(node).text().replace(/\s+/g, " ").trim();
    if (!isJunkParagraph(text)) parts.push(text);
  });

  if (parts.length >= 2) {
    return parts.join("\n\n");
  }

  const blockText = $article("p, h2, h3, li")
    .map((_, node) => $article(node).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((t) => t.length > 40 && !isJunkParagraph(t));

  if (blockText.length >= 2) {
    return blockText.join("\n\n");
  }

  const fallback = $article.root().text().replace(/\s+/g, " ").trim();
  return fallback.length > 80 && !isJunkParagraph(fallback) ? fallback : "";
}

export type ParsedArticlePage = {
  fullText: string;
  imageUrl?: string;
  imageUrls: string[];
};

/**
 * Ham HTML → temiz haber metni + öncelikli görseller (og:image → article img).
 */
export function parseArticleHtml(html: string, pageUrl?: string): ParsedArticlePage {
  const $ = cheerio.load(html);
  const rawRoot = findArticleRoot($);
  const $article = loadCleanedArticleRoot($, rawRoot);

  const fullText = extractParagraphText($article);
  const imageUrls = extractArticleImagesFromRoot($article, html, pageUrl);

  return {
    fullText,
    imageUrls,
    imageUrl: imageUrls[0],
  };
}
