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

// GÜNCELLENDİ: Picsum komutu kaldırıldı, haberi destan gibi uzatması emredildi.
const CONSTITUTION_SYSTEM_INSTRUCTION = `Sen TRNETHABER'in otonom baş editörüsün. Gelen ham veriyi, okuyucuyu bağlayacak uzun ve detaylı bir premium haber formatına çevireceksin.

KESİN KURALLAR:
- Haberi asla 2-3 cümleyle geçiştirme. Ham metindeki tüm detayları kullanarak, en az 3-4 paragraflık destansı, profesyonel ve akıcı bir gazetecilik diliyle haberi genişlet.
- Rakamları ASLA sayıyla veya nokta/virgül ayraçlı yazma; kelimeyle yaz (Örn: 15 bin 350, 4 virgül 2).
- Yüzde sembolü (%) ASLA kullanma; "yüzde 35" şeklinde yaz.
- Kurum adlarını kesme işaretiyle ayırma.
- Asla hayal ürünü (halüsinasyon) bilgi ekleme; yalnızca verilen ham metindeki bilgileri kullanarak zenginleştir.
- Türkçe, net, kurumsal ve premium haber dili kullan.

GÖRSEL KURALI (cover_image):
- Eğer sana "Orijinal Görsel" olarak bir URL verilmişse, HİÇBİR DEĞİŞİKLİK YAPMADAN o URL'yi cover_image alanına yaz.
- Eğer Orijinal Görsel yoksa veya boşsa; o zaman haberin ruhuna uygun, telifsiz bir stok fotoğraf oluşturmak için şu adresi kullan: https://image.pollinations.ai/prompt/{ingilizce_ve_detayli_gorsel_aciklamasi}?width=1200&height=800&nologo=true
  (Örnek: https://image.pollinations.ai/prompt/turkish_police_car_at_night_cinematic?width=1200&height=800&nologo=true)
  ASLA picsum.photos KULLANMA.

SEO (Google Discover):
- seo_keywords: Tam 5 veya 6 odak kelime, virgülle ayrılmış, Türkçe.
- meta_description: En fazla 150 karakter, tıklamaya teşvik eden özet.

Çıktı JSON alanları: title, spot, content, cover_image, seo_keywords, meta_description.`;

const EARTHQUAKE_EXTRA_INSTRUCTION = `
SON DAKİKA DEPREM HABERİ: Çok acil ton kullan. Başlık ve spot son dakika bandına uygun olsun. Büyüklük ve derinlik rakamlarını kelimeyle yaz.`;

// GÜNCELLENDİ: Orijinal Görsel linki Gemini'ye gönderiliyor (type cast ile imageUrl alındı)
function buildWireUserPrompt(wire: AgencyWire & { imageUrl?: string }): string {
  const isEarthquake = wire.id.startsWith("afad-");
  return [
    isEarthquake
      ? "AFAD deprem verisi — SON DAKİKA acil haber sentezle."
      : "Aşağıdaki ham veriyi kullanarak UZUN, DETAYLI ve GAZETECİ DİLİYLE yazılmış bir TRNETHABER haberi oluştur.",
    "Yalnızca bu metinde geçen bilgileri kullan; yeni rakam, isim veya olay uydurma. Haberin tam metnini kullanarak paragraflar halinde yaz.",
    isEarthquake ? EARTHQUAKE_EXTRA_INSTRUCTION : "",
    "",
    `Kategori: ${wire.categorySlug}`,
    `Kaynak: ${wire.sourceLabel}`,
    wire.sourceUrl ? `Kaynak URL: ${wire.sourceUrl}` : "",
    wire.imageUrl ? `Orijinal Görsel (Bunu KULLAN!): ${wire.imageUrl}` : "Orijinal Görsel: YOK (Yapay zeka ile görsel üret)",
    `Başlık (ham): ${wire.rawTitle}`,
    `Spot (ham): ${wire.rawLead}`,
    `Gövde (ham): ${wire.rawBody}`, // Artık buraya sitenin içinden kopyaladığımız koca destan geliyor!
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
  wire: AgencyWire & { imageUrl?: string },
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

  // Kapak görseli önceliği: 1. Gemini'nin kararı (Orijinal veya Pollinations AI) -> 2. Resolve default
  let finalCoverImage = gemini.cover_image;
  if (!finalCoverImage || finalCoverImage.trim() === "") {
    finalCoverImage = resolveGeminiCoverUrl(undefined, slug); // Sistem çökerse default görseli bas
  }

  return {
    title,
    slug,
    spot_metni,
    content,
    kapak_gorseli: finalCoverImage,
    categorySlug: wire.categorySlug,
    is_breaking: wire.isBreaking,
    okuma_sayisi: mockInitialViewCount(slug),
    yazar: "TRNETHABER Otonom Bot",
    imageAlt: coverImageAlt(title),
    seo_keywords,
    meta_description,
  };
}

export async function synthesizeFromWire(wire: AgencyWire & { imageUrl?: string }): Promise<SynthesizedArticle> {
  const raw = await callGeminiJson(CONSTITUTION_SYSTEM_INSTRUCTION, buildWireUserPrompt(wire));
  const gemini = parseArticleJson(raw);
  return finalizeSynthesizedFields(wire, gemini);
}