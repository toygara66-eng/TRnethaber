import { applyConstitutionRules, validateConstitution } from "@/lib/constitution/text";
import { assignReporterForArticle } from "@/lib/bot/assign-reporter";
import { assembleArticleHtml } from "@/lib/bot/article-assembler";
import { coverImageAlt } from "@/lib/bot/cover-image";
import { callGeminiJson } from "@/lib/bot/gemini-client";
import { buildNewsImagePool } from "@/lib/bot/news-image-pipeline";
import {
  buildWireSeoPrompt,
  parseSeoArticleJson,
  SEO_JSON_SYSTEM_INSTRUCTION,
} from "@/lib/bot/seo-content-engine";
import { MIN_INLINE_IMAGES } from "@/lib/bot/seo-article-types";
import { slugifyTitle } from "@/lib/slug";
import type { AgencyWire } from "@/lib/bot/types";

export type SynthesizedArticle = {
  title: string;
  slug: string;
  spot_metni: string;
  content: string;
  kapak_gorseli: string;
  categorySlug: string;
  is_breaking: boolean;
  okuma_sayisi: string;
  yazar: string;
  imageAlt: string;
  seo_keywords: string;
  meta_description: string;
};

export type EnrichedWire = AgencyWire & {
  imageUrl?: string;
  imageUrls?: string[];
};

const EARTHQUAKE_EXTRA_INSTRUCTION = `
SON DAKİKA DEPREM: Acil ton. Büyüklük ve derinlik rakamlarını kelimeyle yaz.`;

function buildWireUserPrompt(wire: EnrichedWire): string {
  const isEarthquake = wire.id.startsWith("afad-");
  const rssList =
    wire.imageUrls?.length
      ? wire.imageUrls.map((u, i) => `  ${i + 1}. ${u}`).join("\n")
      : wire.imageUrl
        ? `  1. ${wire.imageUrl}`
        : "  (yok)";

  return buildWireSeoPrompt([
    isEarthquake
      ? "AFAD deprem verisi — SON DAKİKA acil haber sentezle."
      : "Aşağıdaki ham RSS/ajans verisinden SEO uyumlu haber JSON üret.",
    "Yalnızca ham metindeki bilgileri kullan; uydurma ekleme.",
    "Menü, yorum uyarısı, çerez/KVKK ve benzeri arayüz metinlerini yok say; yalnızca haber konusuna odaklan.",
    isEarthquake ? EARTHQUAKE_EXTRA_INSTRUCTION : "",
    "",
    `Kategori: ${wire.categorySlug}`,
    `Kaynak: ${wire.sourceLabel}`,
    wire.sourceUrl ? `Kaynak URL: ${wire.sourceUrl}` : "",
    `RSS / kaynak görselleri:\n${rssList}`,
    `Başlık (ham): ${wire.rawTitle}`,
    `Spot (ham): ${wire.rawLead}`,
    `Gövde (ham):\n${wire.rawBody}`,
  ]);
}

function normalizeSeoKeywords(keywords: string[], title: string): string {
  const parts =
    keywords.length >= 5
      ? keywords
      : [
          ...keywords,
          ...title.split(/\s+/).filter((w) => w.length > 3).slice(0, 6 - keywords.length),
        ];
  return parts.slice(0, 6).join(", ");
}

function collectRssImages(wire: EnrichedWire): string[] {
  const list: string[] = [];
  if (wire.imageUrl?.trim()) list.push(wire.imageUrl.trim());
  for (const u of wire.imageUrls ?? []) {
    if (u?.trim() && !list.includes(u.trim())) list.push(u.trim());
  }
  return list;
}

async function finalizeFromSeoJson(
  wire: EnrichedWire,
  seoJson: ReturnType<typeof parseSeoArticleJson>,
): Promise<SynthesizedArticle> {
  const title = applyConstitutionRules(seoJson.title);
  const spot_metni = applyConstitutionRules(seoJson.summary).slice(0, 280);
  const meta_description = applyConstitutionRules(seoJson.summary).slice(0, 155);
  const seo_keywords = normalizeSeoKeywords(seoJson.keywords, title);

  const rssImages = collectRssImages(wire);
  const imagePool = await buildNewsImagePool({
    rssImages,
    keywords: seoJson.keywords,
    title,
    summary: seoJson.summary,
    slugSeed: slugifyTitle(title),
  });

  const cover = imagePool[0] ?? rssImages[0] ?? "";
  const inlineImages =
    imagePool.length > 1 ? [...imagePool.slice(1)] : [...imagePool];
  while (inlineImages.length < MIN_INLINE_IMAGES && imagePool.length > 0) {
    inlineImages.push(imagePool[inlineImages.length % imagePool.length]);
  }

  const { html: content } = assembleArticleHtml(
    seoJson.blocks,
    inlineImages.slice(0, Math.max(MIN_INLINE_IMAGES, inlineImages.length)),
    title,
  );

  const violations = [
    ...validateConstitution(title),
    ...validateConstitution(spot_metni),
    ...validateConstitution(content),
    ...validateConstitution(meta_description),
    ...validateConstitution(seo_keywords),
  ];
  if (violations.length > 0) {
    throw new Error(`Anayasa ihlali (Assembler sonrası): ${violations.join(" ")}`);
  }

  if (!cover) {
    throw new Error("Kapak görseli havuzda bulunamadı");
  }

  const yazar = assignReporterForArticle({
    title,
    lead: spot_metni,
    body: wire.rawBody,
    categorySlug: wire.categorySlug,
  });

  return {
    title,
    slug: slugifyTitle(title),
    spot_metni,
    content,
    kapak_gorseli: cover,
    categorySlug: wire.categorySlug,
    is_breaking: wire.isBreaking,
    okuma_sayisi: "0 okuma",
    yazar,
    imageAlt: coverImageAlt(title),
    seo_keywords,
    meta_description,
  };
}

export async function synthesizeFromWire(wire: EnrichedWire): Promise<SynthesizedArticle> {
  const raw = await callGeminiJson(SEO_JSON_SYSTEM_INSTRUCTION, buildWireUserPrompt(wire));
  const seoJson = parseSeoArticleJson(raw, wire.rawTitle);
  return finalizeFromSeoJson(wire, seoJson);
}

/** İçerik motoru (generate-articles) — RSS olmadan konu bazlı üretim */
export async function synthesizeFromTopic(input: {
  userPrompt: string;
  fallbackTitle: string;
  categorySlug: string;
  isBreaking?: boolean;
  sourceId?: string;
}): Promise<SynthesizedArticle> {
  const wire: EnrichedWire = {
    id: input.sourceId ?? `topic-${Date.now()}`,
    categorySlug: input.categorySlug as EnrichedWire["categorySlug"],
    isBreaking: input.isBreaking ?? false,
    rawTitle: input.fallbackTitle,
    rawLead: "",
    rawBody: input.userPrompt,
    sourceLabel: "TRNETHABER İçerik Motoru",
    imageUrls: [],
  };

  const raw = await callGeminiJson(SEO_JSON_SYSTEM_INSTRUCTION, input.userPrompt);
  const seoJson = parseSeoArticleJson(raw, input.fallbackTitle);
  return finalizeFromSeoJson(wire, seoJson);
}
