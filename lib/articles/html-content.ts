import { isBlankValue } from "@/lib/safe-display";

/** İçerik kayıtlı HTML mi? */
export function isLikelyHtml(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  return /<(p|h[1-6]|ul|ol|table|div|blockquote|strong|em|br)\b/i.test(trimmed);
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
