import { uploadProcessedBotImage } from "@/lib/bot/bot-image-upload";
import { filterRelevantImages } from "@/lib/bot/gemini-vision";
import { generateEditorialImagePrompt } from "@/lib/bot/image-prompt";
import { fetchRemoteImageBuffer } from "@/lib/bot/image-process";
import { isJunkImageUrl } from "@/lib/bot/scrape-images";
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

export type NewsImagePipelineOptions = {
  /** Cron hızlı yolu — vision/Imagen/upload atlanır, RSS URL doğrudan kullanılır */
  fast?: boolean;
};

function normalizeCandidate(url: string | undefined | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed || isJunkImageUrl(trimmed)) return null;
  if (!isAllowedCoverUrl(trimmed)) return null;
  return trimmed;
}

async function ingestScrapedUrl(
  url: string,
  slugSeed: string,
): Promise<string | null> {
  const raw = await fetchRemoteImageBuffer(url);
  if (!raw) return null;
  return uploadProcessedBotImage(raw, "covers", slugSeed);
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
 * Yalnızca kapak görseli: scrape (og:image öncelikli) veya Imagen.
 * Gövdeye inline görsel eklenmez.
 */
export async function buildNewsImagePool(
  input: NewsImagePipelineInput,
  options?: NewsImagePipelineOptions,
): Promise<string[]> {
  const slugSeed = input.slugSeed?.trim() || slugifyTitle(input.title) || "haber";
  const fast = options?.fast ?? process.env.NEWS_BOT_FAST_COVER !== "false";

  const scraped = input.rssImages
    .map(normalizeCandidate)
    .filter((u): u is string => Boolean(u));

  const uniqueScraped = Array.from(new Set(scraped));

  if (fast && uniqueScraped.length > 0) {
    console.info("[news-image-pipeline] Hızlı kapak — RSS URL doğrudan");
    return [uniqueScraped[0]];
  }

  if (uniqueScraped.length > 0) {
    const quick = await ingestScrapedUrl(uniqueScraped[0], slugSeed);
    if (quick) return [quick];
  }

  const vetted = await filterRelevantImages(
    uniqueScraped,
    {
      title: input.title,
      keywords: input.keywords,
      summary: input.summary,
    },
    1,
  );

  for (let i = 0; i < vetted.length; i++) {
    const uploaded = await ingestScrapedUrl(vetted[i], `${slugSeed}-${i}`);
    if (uploaded) return [uploaded];
  }

  const aiCover = await generateAiCover(input, slugSeed);
  if (aiCover) return [aiCover];

  return [];
}

/** @deprecated — image-pool.ts uyumluluğu */
export type ImagePoolInput = NewsImagePipelineInput;
