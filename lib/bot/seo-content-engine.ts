import { applyConstitutionRules } from "@/lib/constitution/text";
import { parseJsonObject } from "@/lib/bot/gemini-client";
import {
  GEMINI_NO_BODY_IMAGES_RULE,
  stripArticleContentForPersist,
} from "@/lib/bot/strip-article-content";
import type { ArticleBlock, SeoArticleGeminiJson } from "@/lib/bot/seo-article-types";
import { MIN_H2_BLOCKS } from "@/lib/bot/seo-article-types";

export const SEO_JSON_SYSTEM_INSTRUCTION = `Sen TRNETHABER Kıdemli SEO Editörüsün.
Ham haber verisini Featured Snippet ve Discover uyumlu, blok tabanlı JSON üret.

ÇIKTI: Yalnızca geçerli JSON. HTML, Markdown veya kod bloğu YOK.

Şema:
{
  "title": "string — 60-70 karakter, ana anahtar kelime başta",
  "keywords": ["string"] — tam 5-7 LSI/semantik anahtar kelime (Türkçe),
  "summary": "string — meta açıklama, en fazla 150 karakter",
  "blocks": [
    { "type": "p", "text": "2-3 cümle kısa paragraf. Önemli isim/rakamları **kalın** yap." },
    { "type": "h2", "text": "Alt başlık" },
    { "type": "ul", "items": ["madde 1", "madde 2", "madde 3"] },
    ...
  ]
}

KURALLAR:
- blocks içinde EN AZ ${MIN_H2_BLOCKS} adet { "type": "h2" } olmalı.
- EN AZ 1 adet { "type": "ul" } — önemli maddeler (Featured Snippet için).
- Paragraflar (p) kısa: en fazla 3 cümle.
- p metinlerinde kritik verileri **çift yıldız** ile vurgula (strong).
- Rakamları kelimeyle yaz; yüzde sembolü kullanma; kurum adında kesme işareti yok.
- H1 kullanma. Bilgi uydurma; yalnızca verilen ham metin.
- Akış: giriş p → h2 → p → ul veya p → h2 → p (görsel yerleşimi editör tarafından yapılacak).

HAM METİN TEMİZLİĞİ:
- Sana verilen metnin içindeki menü yazıları, yorum uyarısı, çerez politikası ve benzeri alakasız web sitesi arayüz metinlerini tamamen görmezden gel.
- Yalnızca haberin ana konusuna odaklanarak yeni bir metin yaz.`;

function parseKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
      .map((k) => applyConstitutionRules(k.trim()))
      .slice(0, 7);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,;|]/)
      .map((k) => applyConstitutionRules(k.trim()))
      .filter(Boolean)
      .slice(0, 7);
  }
  return [];
}

function blockField(row: Record<string, unknown>): string {
  let raw = "";
  if (typeof row.text === "string") raw = row.text.trim();
  else if (typeof row.content === "string") raw = row.content.trim();
  return stripArticleContentForPersist(applyConstitutionRules(raw));
}

function parseBlock(raw: unknown): ArticleBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const type = row.type;
  const text = blockField(row);

  if (type === "h2" && text) {
    return { type: "h2", text };
  }

  if (type === "p" && text) {
    return { type: "p", text };
  }

  if (type === "ul" && Array.isArray(row.items)) {
    const items = row.items
      .filter((i): i is string => typeof i === "string" && i.trim().length > 0)
      .map((i) => stripArticleContentForPersist(applyConstitutionRules(i.trim())))
      .slice(0, 8);
    if (items.length > 0) return { type: "ul", items };
  }

  return null;
}

export function parseSeoArticleJson(raw: string, fallbackTitle: string): SeoArticleGeminiJson {
  const obj = parseJsonObject<Record<string, unknown>>(raw);

  const title = applyConstitutionRules(
    typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : fallbackTitle,
  );
  const keywords = parseKeywords(obj.keywords);
  const summary = applyConstitutionRules(
    typeof obj.summary === "string" ? obj.summary.trim().slice(0, 150) : title.slice(0, 150),
  );

  const blocks: ArticleBlock[] = [];
  if (Array.isArray(obj.blocks)) {
    for (const item of obj.blocks) {
      const block = parseBlock(item);
      if (block) blocks.push(block);
    }
  }

  if (blocks.length === 0) {
    throw new Error("Gemini JSON: blocks dizisi boş");
  }

  const hasUl = blocks.some((b) => b.type === "ul");
  if (!hasUl) {
    blocks.splice(Math.min(2, blocks.length), 0, {
      type: "ul",
      items: [
        `${title} haberinin öne çıkan başlıkları`,
        "Gelişmeler yakından takip ediliyor",
        "Detaylar resmi açıklamalarda paylaşılacak",
      ],
    });
  }

  return { title, keywords, summary, blocks };
}

export function buildWireSeoPrompt(parts: string[]): string {
  return parts.filter(Boolean).join("\n");
}
