import { isBlankValue } from "@/lib/safe-display";

const HTML_TAG_RE =
  /<(p|h[1-6]|ul|ol|li|table|div|blockquote|strong|b|em|br)\b/i;

const ENCODED_HTML_TAG_RE =
  /&lt;(p|h[1-6]|ul|ol|li|table|div|blockquote|strong|b|em|br)\b/i;

/** İçerik kayıtlı HTML mi (ham veya entity-escape edilmiş)? */
export function isLikelyHtml(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  return HTML_TAG_RE.test(trimmed) || ENCODED_HTML_TAG_RE.test(trimmed);
}

/** Bot kayıtlarında &lt;strong&gt; gibi kaçışlı etiketleri geri açar */
export function decodeEscapedArticleHtml(html: string): string {
  if (!ENCODED_HTML_TAG_RE.test(html)) return html;
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Gösterim için içerik HTML'i — escape edilmiş legacy kayıtlar ve düz metin dahil.
 */
export function normalizeArticleContentHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  if (ENCODED_HTML_TAG_RE.test(trimmed)) {
    const decoded = decodeEscapedArticleHtml(trimmed);
    return isLikelyHtml(decoded) ? decoded : toEditorHtml(decoded);
  }

  if (isLikelyHtml(trimmed)) return trimmed;

  return toEditorHtml(trimmed);
}

export function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineToHtml(text: string): string {
  return escapeText(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

/** Eski düz metin / markdown benzeri içeriği editör HTML'ine çevirir */
export function toEditorHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "<p></p>";
  if (isLikelyHtml(trimmed)) return trimmed;

  const blocks = trimmed.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return "<p></p>";

  return blocks
    .map((block) => {
      if (block.startsWith("### ")) {
        return `<h3>${inlineToHtml(block.slice(4))}</h3>`;
      }
      if (block.startsWith("## ")) {
        return `<h2>${inlineToHtml(block.slice(3))}</h2>`;
      }
      if (block.startsWith("# ")) {
        return `<h2>${inlineToHtml(block.slice(2))}</h2>`;
      }
      if (/^[-*]\s+/m.test(block)) {
        const items = block
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => /^[-*]\s+/.test(line))
          .map((line) => `<li>${inlineToHtml(line.replace(/^[-*]\s+/, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inlineToHtml(block).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}
