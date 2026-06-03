import { uploadProcessedBotImage } from "@/lib/bot/bot-image-upload";
import { fetchRemoteImageBuffer } from "@/lib/bot/image-process";
import {
  DEFAULT_COVER_IMAGE,
  isAllowedCoverUrl,
  PLACEHOLDER_IMAGE,
} from "@/lib/images/cover";

const WIKI_USER_AGENT = "TRNETHABER-SehirRehberiBot/1.0 (+https://trnethaber.com)";
const WIKI_API = "https://tr.wikipedia.org/w/api.php";
const WIKI_TIMEOUT_MS = 12_000;

function normalizeWikiImageUrl(url: string | undefined | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed || !isAllowedCoverUrl(trimmed)) return null;
  return trimmed;
}

function pageImageFromQuery(data: {
  query?: {
    pages?: Record<
      string,
      {
        missing?: string;
        thumbnail?: { source?: string };
        original?: { source?: string };
      }
    >;
  };
}): string | null {
  for (const page of Object.values(data.query?.pages ?? {})) {
    if (page.missing) continue;
    const candidate =
      normalizeWikiImageUrl(page.original?.source) ??
      normalizeWikiImageUrl(page.thumbnail?.source);
    if (candidate) return candidate;
  }
  return null;
}

/** MediaWiki query — titles + pageimages (pithumbsize 1200) */
async function fetchWikiPageImageByTitle(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "pageimages",
    format: "json",
    pithumbsize: "1200",
    origin: "*",
  });

  try {
    const res = await fetch(`${WIKI_API}?${params.toString()}`, {
      headers: { "User-Agent": WIKI_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(WIKI_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Parameters<typeof pageImageFromQuery>[0];
    return pageImageFromQuery(data);
  } catch (err) {
    console.warn("[sehir-rehberi-bot] Wikipedia query:", title, err);
    return null;
  }
}

async function fetchWikiPageImageBySearch(cityName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: cityName,
    gsrlimit: "5",
    prop: "pageimages",
    piprop: "original|thumbnail",
    pithumbsize: "1200",
    origin: "*",
  });

  try {
    const res = await fetch(`${WIKI_API}?${params.toString()}`, {
      headers: { "User-Agent": WIKI_USER_AGENT },
      signal: AbortSignal.timeout(WIKI_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Parameters<typeof pageImageFromQuery>[0];
    return pageImageFromQuery(data);
  } catch (err) {
    console.warn("[sehir-rehberi-bot] Wikipedia search:", cityName, err);
    return null;
  }
}

async function fetchWikiRestSummaryImage(cityName: string): Promise<string | null> {
  const title = encodeURIComponent(cityName.trim().replace(/\s+/g, "_"));
  try {
    const res = await fetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${title}`, {
      headers: { "User-Agent": WIKI_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(WIKI_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    };
    return (
      normalizeWikiImageUrl(data.originalimage?.source) ??
      normalizeWikiImageUrl(data.thumbnail?.source)
    );
  } catch {
    return null;
  }
}

/**
 * Şehir adıyla Wikipedia TR'den gerçek kapak görseli URL'si.
 */
export async function fetchWikipediaCityCoverUrl(cityName: string): Promise<string | null> {
  const cleanCityName = cityName.trim();
  if (!cleanCityName) return null;

  const titleCandidates = [
    cleanCityName,
    `${cleanCityName} ili`,
    cleanCityName.replace(/\s+/g, "_"),
  ];

  for (const title of titleCandidates) {
    const fromQuery = await fetchWikiPageImageByTitle(title);
    if (fromQuery) {
      console.info(`[sehir-rehberi-bot] Wikipedia kapak (${title}): ${cleanCityName}`);
      return fromQuery;
    }
  }

  const fromRest = await fetchWikiRestSummaryImage(cleanCityName);
  if (fromRest) {
    console.info(`[sehir-rehberi-bot] Wikipedia özet görseli: ${cleanCityName}`);
    return fromRest;
  }

  const fromSearch = await fetchWikiPageImageBySearch(cleanCityName);
  if (fromSearch) {
    console.info(`[sehir-rehberi-bot] Wikipedia arama görseli: ${cleanCityName}`);
    return fromSearch;
  }

  return null;
}

async function persistCoverBytes(
  wikiUrl: string,
  slugSeed: string,
): Promise<string | null> {
  const raw = await fetchRemoteImageBuffer(wikiUrl);
  if (!raw) return null;
  return uploadProcessedBotImage(raw, "covers", `sehir-${slugSeed}`);
}

/**
 * Wikipedia görseli → mümkünse Supabase'e yükle; değilse doğrudan URL; yoksa varsayılan kapak.
 */
export async function resolveSehirRehberiCoverImage(
  cityName: string,
  articleSlug: string,
): Promise<{ kapak: string; source: "wikipedia_upload" | "wikipedia_url" | "default" }> {
  const wikiUrl = await fetchWikipediaCityCoverUrl(cityName);

  if (wikiUrl) {
    const uploaded = await persistCoverBytes(wikiUrl, articleSlug);
    if (uploaded) {
      return { kapak: uploaded, source: "wikipedia_upload" };
    }
    return { kapak: wikiUrl, source: "wikipedia_url" };
  }

  console.warn(
    `[sehir-rehberi-bot] ${cityName} için Wikipedia görseli bulunamadı; varsayılan kapak atanıyor.`,
  );
  return { kapak: PLACEHOLDER_IMAGE || DEFAULT_COVER_IMAGE, source: "default" };
}
