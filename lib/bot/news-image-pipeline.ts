import { uploadProcessedBotImage } from "@/lib/bot/bot-image-upload";
import { filterRelevantImages } from "@/lib/bot/gemini-vision";
import { generateEditorialImagePrompt } from "@/lib/bot/image-prompt";
import { fetchRemoteImageBuffer } from "@/lib/bot/image-process";
import { isJunkImageUrl } from "@/lib/bot/scrape-images";
import { MIN_INLINE_IMAGES } from "@/lib/bot/seo-article-types";
import { isAllowedCoverUrl } from "@/lib/images/cover";
import { slugifyTitle } from "@/lib/slug";
import { generateImagenToBuffer } from "@/utils/image-agent";

export type NewsImagePipelineInput = {
  rssImages: string[];
  keywords: string[];
  title: string;
  summary: string;
  slugSeed?: string;
};

function normalizeCandidate(url: string | undefined | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed || isJunkImageUrl(trimmed)) return null;
  if (!isAllowedCoverUrl(trimmed)) return null;
  return trimmed;
}

async function ingestScrapedUrl(
  url: string,
  folder: "covers" | "inline",
  slugSeed: string,
): Promise<string | null> {
  const raw = await fetchRemoteImageBuffer(url);
  if (!raw) return null;
  return uploadProcessedBotImage(raw, folder, slugSeed);
}

async function generateAiCover(
  input: NewsImagePipelineInput,
  slugSeed: string,
): Promise<string | null> {
  const prompt = await generateEditorialImagePrompt({
    title: input.title,
    summary: input.summary,
    keywords: input.keywords,
  });

  console.info("[news-image-pipeline] AI görsel üretiliyor:", prompt.slice(0, 120), "…");

  const raw = await generateImagenToBuffer(prompt);
  if (!raw) {
    console.warn("[news-image-pipeline] Imagen çıktısı alınamadı");
    return null;
  }

  return uploadProcessedBotImage(raw, "covers", slugSeed);
}

/**
 * 1) Akıllı scrape URL'leri (og:image öncelikli, anti-logo)
 * 2) Yoksa Gemini prompt + Imagen üretimi (varsayılan logo yok)
 * 3) sharp → 1280px WebP → Supabase news-images
 */
export async function buildNewsImagePool(input: NewsImagePipelineInput): Promise<string[]> {
  const slugSeed = input.slugSeed?.trim() || slugifyTitle(input.title) || "haber";

  const scraped = input.rssImages
    .map(normalizeCandidate)
    .filter((u): u is string => Boolean(u));

  const uniqueScraped = Array.from(new Set(scraped));

  const vetted = await filterRelevantImages(
    uniqueScraped,
    {
      title: input.title,
      keywords: input.keywords,
      summary: input.summary,
    },
    MIN_INLINE_IMAGES + 1,
  );

  const pool: string[] = [];
  const targetCount = MIN_INLINE_IMAGES + 1;

  for (let i = 0; i < vetted.length && pool.length < targetCount; i++) {
    const folder = pool.length === 0 ? "covers" : "inline";
    const uploaded = await ingestScrapedUrl(vetted[i], folder, `${slugSeed}-${i}`);
    if (uploaded && !pool.includes(uploaded)) {
      pool.push(uploaded);
    }
  }

  if (pool.length === 0) {
    const aiCover = await generateAiCover(input, slugSeed);
    if (aiCover) pool.push(aiCover);
  }

  if (pool.length === 0) {
    return [];
  }

  const cover = pool[0];
  while (pool.length < targetCount) {
    pool.push(pool[pool.length - 1] ?? cover);
  }

  return pool.slice(0, targetCount);
}

/** @deprecated — image-pool.ts uyumluluğu */
export type ImagePoolInput = NewsImagePipelineInput;
