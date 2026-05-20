import { applyConstitutionRules, validateConstitution } from "@/lib/constitution/text";
import { slugifyTitle } from "@/lib/slug";
import { coverImageAlt } from "@/lib/bot/cover-image";
import { callGeminiJson, parseJsonObject } from "@/lib/bot/gemini-client";
import { resolveGeminiCoverUrl } from "@/lib/images/cover";
import { mockInitialViewCount } from "@/lib/bot/view-count";
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

type GeminiArticleJson = {
  title: string;
  spot: string;
  content: string;
  cover_image?: string;
  seo_keywords?: string;
  meta_description?: string;
};

const CONSTITUTION_SYSTEM_INSTRUCTION = `Sen TRNETHABER'in otonom baş editörüsün. Gelen ham veriyi premium bir haber formatına çevireceksin.

KESİN KURALLAR:
- Rakamları ASLA sayıyla veya nokta/virgül ayraçlı yazma; kelimeyle yaz (Örn: 15 bin 350, 4 virgül 2).
- Yüzde sembolü (%) ASLA kullanma; "yüzde 35" şeklinde yaz.
- Kurum adlarını kesme işaretiyle ayırma.
- Asla hayal ürünü (halüsinasyon) bilgi ekleme; yalnızca verilen ham metindeki bilgileri kullan.
- Türkçe, net, kurumsal ve premium haber dili kullan.
- Kapak görseli (cover_image): SADECE doğrudan erişilebilir bir https .jpg URL döndür.
  Örnek: https://picsum.photos/seed/12345/1200/800.jpg

SEO (Google Discover):
- seo_keywords: Tam 5 veya 6 odak kelime, virgülle ayrılmış, Türkçe (ör: deprem, gaziantep, son dakika, afad, sarsıntı).
- meta_description: En fazla 150 karakter, tıklamaya teşvik eden özet; anayasa kurallarına uygun.

Çıktı JSON alanları: title, spot, content, cover_image, seo_keywords, meta_description.`;

const EARTHQUAKE_EXTRA_INSTRUCTION = `
SON DAKİKA DEPREM HABERİ: Çok acil ton kullan. Başlık ve spot son dakika bandına uygun olsun. Büyüklük ve derinlik rakamlarını kelimeyle yaz.`;

function buildWireUserPrompt(wire: AgencyWire): string {
  const isEarthquake = wire.id.startsWith("afad-");
  return [
    isEarthquake
      ? "AFAD deprem verisi — SON DAKİKA acil haber sentezle."
      : "Aşağıdaki ham ajans telini TRNETHABER formatında sentezle.",
    "Yalnızca bu metinde geçen bilgileri kullan; yeni rakam, isim veya olay uydurma.",
    isEarthquake ? EARTHQUAKE_EXTRA_INSTRUCTION : "",
    "",
    `Kategori: ${wire.categorySlug}`,
    `Kaynak: ${wire.sourceLabel}`,
    wire.sourceUrl ? `Kaynak URL: ${wire.sourceUrl}` : "",
    `Başlık (ham): ${wire.rawTitle}`,
    `Spot (ham): ${wire.rawLead}`,
    `Gövde (ham): ${wire.rawBody}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseArticleJson(raw: string): GeminiArticleJson {
  const obj = parseJsonObject<Record<string, unknown>>(raw);
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const spot = typeof obj.spot === "string" ? obj.spot.trim() : "";
  const content = typeof obj.content === "string" ? obj.content.trim() : "";
  const cover_image =
    typeof obj.cover_image === "string" ? obj.cover_image.trim() : undefined;
  const seo_keywords =
    typeof obj.seo_keywords === "string" ? obj.seo_keywords.trim() : "";
  const meta_description =
    typeof obj.meta_description === "string" ? obj.meta_description.trim() : "";

  if (!title || !spot || !content) {
    throw new Error("Gemini JSON eksik: title, spot ve content zorunlu");
  }

  return { title, spot, content, cover_image, seo_keywords, meta_description };
}

function normalizeMetaDescription(text: string | undefined, fallback: string): string {
  const base = applyConstitutionRules(text || fallback).trim();
  if (base.length <= 155) return base;
  return `${base.slice(0, 152).trim()}…`;
}

function normalizeSeoKeywords(text: string | undefined, title: string): string {
  const raw = text || title;
  const parts = raw
    .split(/[,;|]/)
    .map((p) => applyConstitutionRules(p.trim()))
    .filter(Boolean)
    .slice(0, 6);
  return parts.length >= 5 ? parts.join(", ") : parts.join(", ");
}

function finalizeSynthesizedFields(
  wire: AgencyWire,
  gemini: GeminiArticleJson,
): SynthesizedArticle {
  const title = applyConstitutionRules(gemini.title);
  const spot_metni = applyConstitutionRules(gemini.spot).slice(0, 280);
  const content = applyConstitutionRules(gemini.content);
  const meta_description = normalizeMetaDescription(gemini.meta_description, spot_metni);
  const seo_keywords = normalizeSeoKeywords(gemini.seo_keywords, title);

  const violations = [
    ...validateConstitution(title),
    ...validateConstitution(spot_metni),
    ...validateConstitution(content),
    ...validateConstitution(meta_description),
    ...validateConstitution(seo_keywords),
  ];
  if (violations.length > 0) {
    throw new Error(`Anayasa ihlali (Gemini sonrası): ${violations.join(" ")}`);
  }

  const slug = slugifyTitle(title);

  return {
    title,
    slug,
    spot_metni,
    content,
    kapak_gorseli: resolveGeminiCoverUrl(gemini.cover_image, slug),
    categorySlug: wire.categorySlug,
    is_breaking: wire.isBreaking,
    okuma_sayisi: mockInitialViewCount(slug),
    yazar: "TRNETHABER Otonom Bot",
    imageAlt: coverImageAlt(title),
    seo_keywords,
    meta_description,
  };
}

export async function synthesizeFromWire(wire: AgencyWire): Promise<SynthesizedArticle> {
  const raw = await callGeminiJson(CONSTITUTION_SYSTEM_INSTRUCTION, buildWireUserPrompt(wire));
  const gemini = parseArticleJson(raw);
  return finalizeSynthesizedFields(wire, gemini);
}
