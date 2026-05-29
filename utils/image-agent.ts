/**
 * TRNETHABER — Görsel Ajanı
 * Haber içeriğine göre Unsplash arama veya Vertex Imagen üretimi.
 */

import { google } from "googleapis";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildPicsumCoverUrl,
  DEFAULT_COVER_IMAGE,
  isAllowedCoverUrl,
} from "@/lib/images/cover";
import { finalizeAiImagePrompt } from "@/lib/bot/ai-image-prompt";
import { buildUnsplashCoverUrl } from "@/lib/bot/cover-image";

export type ImageStrategyMode = "search" | "generate";

export type CoverImageResult = {
  url: string;
  source: "unsplash" | "imagen" | "google_cse" | "fallback";
  usedFallback: boolean;
};

const VERTEX_IMAGEN_MODEL =
  process.env.VERTEX_IMAGEN_MODEL?.trim() || "imagen-3.0-generate-001";

function normalizeUrl(url: string): string | null {
  const trimmed = url?.trim();
  if (!trimmed || !isAllowedCoverUrl(trimmed)) return null;
  return trimmed;
}

async function getGoogleAccessToken(): Promise<string> {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!keyFile) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS tanımlı değil");
  }

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error("Google access token alınamadı");
  }
  return token.token;
}

/**
 * Unsplash API veya Google Görsel Arama (googleapis) ile fotoğraf bulur.
 */
export async function searchUnsplash(query: string): Promise<CoverImageResult> {
  const q = query.trim() || "turkey news editorial";
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();

  if (accessKey) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=1&orientation=landscape`,
        {
          headers: { Authorization: `Client-ID ${accessKey}` },
          signal: AbortSignal.timeout(12_000),
        },
      );

      if (res.ok) {
        const json = (await res.json()) as {
          results?: { urls?: { regular?: string; full?: string } }[];
        };
        const candidate =
          json.results?.[0]?.urls?.regular ?? json.results?.[0]?.urls?.full;
        const url = normalizeUrl(candidate ?? "");
        if (url) {
          return { url, source: "unsplash", usedFallback: false };
        }
      }
    } catch (err) {
      console.warn("[image-agent] Unsplash API:", err);
    }
  }

  const cseId = process.env.GOOGLE_CSE_ID?.trim();
  const googleApiKey = process.env.GOOGLE_API_KEY?.trim();
  if (cseId && googleApiKey) {
    try {
      const customsearch = google.customsearch("v1");
      const response = await customsearch.cse.list({
        key: googleApiKey,
        cx: cseId,
        q,
        searchType: "image",
        num: 1,
        safe: "active",
        imgSize: "xlarge",
      });

      const link = response.data.items?.[0]?.link;
      const url = normalizeUrl(link ?? "");
      if (url) {
        return { url, source: "google_cse", usedFallback: false };
      }
    } catch (err) {
      console.warn("[image-agent] Google CSE:", err);
    }
  }

  const curated = buildUnsplashCoverUrl(q);
  return {
    url: normalizeUrl(curated) ?? DEFAULT_COVER_IMAGE,
    source: "fallback",
    usedFallback: true,
  };
}

/**
 * Haber gövdesi için çoklu görsel adayı — Unsplash API veya Google CSE.
 */
export async function searchNewsImageCandidates(
  query: string,
  limit = 6,
): Promise<string[]> {
  const q = query.trim() || "turkey news editorial";
  const urls: string[] = [];
  const cap = Math.min(Math.max(limit, 1), 10);

  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (accessKey) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${cap}&orientation=landscape`,
        {
          headers: { Authorization: `Client-ID ${accessKey}` },
          signal: AbortSignal.timeout(12_000),
        },
      );
      if (res.ok) {
        const json = (await res.json()) as {
          results?: { urls?: { regular?: string; full?: string } }[];
        };
        for (const row of json.results ?? []) {
          const candidate = row.urls?.regular ?? row.urls?.full;
          const url = normalizeUrl(candidate ?? "");
          if (url) urls.push(url);
        }
      }
    } catch (err) {
      console.warn("[image-agent] Unsplash multi search:", err);
    }
  }

  if (urls.length < cap) {
    const cseId = process.env.GOOGLE_CSE_ID?.trim();
    const googleApiKey = process.env.GOOGLE_API_KEY?.trim();
    if (cseId && googleApiKey) {
      try {
        const customsearch = google.customsearch("v1");
        const response = await customsearch.cse.list({
          key: googleApiKey,
          cx: cseId,
          q,
          searchType: "image",
          num: Math.min(cap, 10),
          safe: "active",
          imgSize: "xlarge",
        });
        for (const item of response.data.items ?? []) {
          const url = normalizeUrl(item.link ?? "");
          if (url) urls.push(url);
        }
      } catch (err) {
        console.warn("[image-agent] Google CSE multi:", err);
      }
    }
  }

  const deduped = Array.from(new Set(urls));
  if (deduped.length >= cap) return deduped.slice(0, cap);

  const seed = Math.abs(q.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  for (let i = 0; i < cap - deduped.length; i++) {
    const fallback = normalizeUrl(buildUnsplashCoverUrl(`${q}-${seed + i}`));
    if (fallback) deduped.push(fallback);
  }

  return deduped.slice(0, cap);
}

/** Vertex Imagen ham çıktısı — sharp/upload öncesi buffer */
export async function generateImagenToBuffer(prompt: string): Promise<Buffer | null> {
  const imagenPrompt = finalizeAiImagePrompt(prompt);
  const projectId = process.env.GCP_PROJECT_ID?.trim();
  const location = process.env.GCP_LOCATION?.trim() || "us-central1";

  if (!projectId || !process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    console.warn("[image-agent] Imagen için GCP_PROJECT_ID ve GOOGLE_APPLICATION_CREDENTIALS gerekli");
    return null;
  }

  try {
    const token = await getGoogleAccessToken();
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${VERTEX_IMAGEN_MODEL}:predict`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [{ prompt: imagenPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          negativePrompt: "text, watermark, logo, blurry, cartoon, avatar, icon",
        },
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Imagen HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      predictions?: { bytesBase64Encoded?: string }[];
    };

    const base64 = json.predictions?.[0]?.bytesBase64Encoded;
    if (!base64) return null;
    return Buffer.from(base64, "base64");
  } catch (err) {
    console.error("[image-agent] generateImagenToBuffer:", err);
    return null;
  }
}

/**
 * Vertex AI Imagen 3 — googleapis auth + REST predict.
 */
export async function generateImagen(
  prompt: string,
  slugSeed = "trnet",
): Promise<CoverImageResult> {
  if (!process.env.GCP_PROJECT_ID?.trim() || !process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    throw new Error("Vertex Imagen için GCP_PROJECT_ID ve GOOGLE_APPLICATION_CREDENTIALS gerekli");
  }

  try {
    const buffer = await generateImagenToBuffer(prompt);
    if (!buffer) {
      throw new Error("Imagen base64 çıktısı boş");
    }

    const { uploadProcessedBotImage } = await import("@/lib/bot/bot-image-upload");
    const uploaded = await uploadProcessedBotImage(buffer, "covers", slugSeed);
    if (uploaded) {
      return { url: uploaded, source: "imagen", usedFallback: false };
    }

    throw new Error("Imagen görseli Supabase'e yüklenemedi");
  } catch (err) {
    console.error("[image-agent] generateImagen:", err);
    throw err;
  }
}

/**
 * Stratejiye göre kapak URL üretir; her durumda geçerli HTTPS URL döner.
 */
export async function resolveCoverByStrategy(
  strategy: ImageStrategyMode,
  imagePrompt: string,
  slugSeed: string,
): Promise<CoverImageResult> {
  const prompt = imagePrompt.trim() || slugSeed;

  try {
    if (strategy === "search") {
      return await searchUnsplash(prompt);
    }
    return await generateImagen(prompt, slugSeed);
  } catch (err) {
    console.warn("[image-agent] resolveCoverByStrategy fallback:", err);
    const picsum = buildPicsumCoverUrl(slugSeed);
    return {
      url: normalizeUrl(picsum) ?? DEFAULT_COVER_IMAGE,
      source: "fallback",
      usedFallback: true,
    };
  }
}
