import { google } from "googleapis";
import { uploadProcessedBotImage } from "@/lib/bot/bot-image-upload";
import { fetchRemoteImageBuffer } from "@/lib/bot/image-process";
import { buildPicsumCoverUrl, isAllowedCoverUrl } from "@/lib/images/cover";

const WIKI_USER_AGENT = "TRNETHABER-KimdirBot/1.0 (+https://trnethaber.com)";

function normalizeImageUrl(url: string | undefined | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed || !isAllowedCoverUrl(trimmed)) return null;
  return trimmed;
}

/** Wikipedia TR REST özet — thumbnail / originalimage */
async function fetchWikipediaTrPortraitUrl(personName: string): Promise<string | null> {
  const titleVariants = [
    personName.trim().replace(/\s+/g, "_"),
    personName.trim(),
  ];

  for (const title of titleVariants) {
    const encoded = encodeURIComponent(title);
    const url = `https://tr.wikipedia.org/api/rest_v1/page/summary/${encoded}`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": WIKI_USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as {
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
      };

      const candidate =
        normalizeImageUrl(data.originalimage?.source) ??
        normalizeImageUrl(data.thumbnail?.source);
      if (candidate) {
        console.info(`[kimdir-bot] Wikipedia görseli bulundu: ${personName}`);
        return candidate;
      }
    } catch (err) {
      console.warn("[kimdir-bot] Wikipedia summary:", title, err);
    }
  }

  return fetchWikipediaSearchPortraitUrl(personName);
}

/** MediaWiki arama — pageimages */
async function fetchWikipediaSearchPortraitUrl(personName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: personName,
    gsrlimit: "3",
    prop: "pageimages",
    piprop: "original|thumbnail",
    pithumbsize: "1200",
    origin: "*",
  });

  try {
    const res = await fetch(
      `https://tr.wikipedia.org/w/api.php?${params.toString()}`,
      {
        headers: { "User-Agent": WIKI_USER_AGENT },
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          { thumbnail?: { source?: string }; original?: { source?: string } }
        >;
      };
    };

    for (const page of Object.values(data.query?.pages ?? {})) {
      const candidate =
        normalizeImageUrl(page.original?.source) ??
        normalizeImageUrl(page.thumbnail?.source);
      if (candidate) {
        console.info(`[kimdir-bot] Wikipedia arama görseli: ${personName}`);
        return candidate;
      }
    }
  } catch (err) {
    console.warn("[kimdir-bot] Wikipedia search:", err);
  }

  return null;
}

/** Google Custom Search Image — GOOGLE_API_KEY + GOOGLE_CSE_ID */
async function fetchGoogleCsePortraitUrl(personName: string): Promise<string | null> {
  const cseId = process.env.GOOGLE_CSE_ID?.trim();
  const googleApiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!cseId || !googleApiKey) return null;

  const q = `${personName} portrait official photo`;

  try {
    const customsearch = google.customsearch("v1");
    const response = await customsearch.cse.list({
      key: googleApiKey,
      cx: cseId,
      q,
      searchType: "image",
      num: 3,
      safe: "active",
      imgSize: "xlarge",
    });

    for (const item of response.data.items ?? []) {
      const url = normalizeImageUrl(item.link ?? "");
      if (url) {
        console.info(`[kimdir-bot] Google CSE görseli: ${personName}`);
        return url;
      }
    }
  } catch (err) {
    console.warn("[kimdir-bot] Google CSE:", err);
  }

  return null;
}

async function ingestPortraitToStorage(
  remoteUrl: string,
  slugSeed: string,
): Promise<string | null> {
  const raw = await fetchRemoteImageBuffer(remoteUrl);
  if (!raw) return null;
  return uploadProcessedBotImage(raw, "covers", `kimdir-${slugSeed}`);
}

export type KimdirCoverResolveResult = {
  url: string;
  source: "wikipedia" | "google_cse" | "fallback";
};

/**
 * LLM sonrası gerçek kişi fotoğrafı: Wikipedia → Google CSE → yedek.
 * URL doğrudan kaydedilmez; Supabase news-images bucket'a yüklenir.
 */
export async function resolveKimdirPersonCoverImage(
  personName: string,
  slugSeed: string,
): Promise<KimdirCoverResolveResult> {
  const wikiUrl = await fetchWikipediaTrPortraitUrl(personName);
  if (wikiUrl) {
    const uploaded = await ingestPortraitToStorage(wikiUrl, slugSeed);
    if (uploaded) return { url: uploaded, source: "wikipedia" };
  }

  const cseUrl = await fetchGoogleCsePortraitUrl(personName);
  if (cseUrl) {
    const uploaded = await ingestPortraitToStorage(cseUrl, slugSeed);
    if (uploaded) return { url: uploaded, source: "google_cse" };
  }

  console.warn(
    `[kimdir-bot] "${personName}" için doğrulanmış görsel bulunamadı; yedek kapak kullanılıyor.`,
  );
  return { url: buildPicsumCoverUrl(slugSeed), source: "fallback" };
}
