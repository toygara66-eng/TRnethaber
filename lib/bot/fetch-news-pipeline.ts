import Parser from "rss-parser";
import { normalizeMetaDescription } from "@/lib/articles/summary-text";
import { assignReporterForArticle } from "@/lib/bot/assign-reporter";
import { assembleFetchNewsHtml } from "@/lib/bot/fetch-news-assembler";
import { stripArticleContentForPersist } from "@/lib/bot/strip-article-content";
import {
  ArticleDuplicateCache,
  DUPLICATE_SLUG_SKIP_MESSAGE,
  DUPLICATE_TITLE_SKIP_MESSAGE,
  DUPLICATE_URL_SKIP_MESSAGE,
  duplicateReasonFromPostgres,
  findAggressiveDuplicate,
  type DuplicateReason,
} from "@/lib/bot/duplicate-check";
import { cleanRssSourceUrl } from "@/lib/bot/source-url";
import { generateFetchNewsJson } from "@/lib/bot/fetch-news-gemini";
import { isGeminiBusyError, logGeminiBusy } from "@/lib/bot/gemini-client";
import { awaitPublishJitter } from "@/lib/bot/publish-jitter";
import { FetchNewsPublishSchedule } from "@/lib/bot/publish-schedule";
import { buildNewsImagePool } from "@/lib/bot/news-image-pipeline";
import { scrapeArticlePage, stripHtml } from "@/lib/bot/rss-scrape";
import { TURKIYE_ILLER } from "@/lib/data/turkiye-iller";
import { getActiveRssSources } from "@/lib/queries/rss-sources";
import type { RssSourceRow } from "@/lib/queries/rss-sources";
import { slugifyTitle } from "@/lib/slug";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AgencyWire } from "@/lib/bot/types";

type RssItem = {
  title?: string;
  link?: string;
  guid?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
};

const RSS_FETCH_TIMEOUT_MS = Math.min(
  20_000,
  Math.max(8_000, Number(process.env.FETCH_NEWS_RSS_TIMEOUT_MS ?? 12_000) || 12_000),
);

const parser = new Parser<RssItem, Record<string, unknown>>({
  timeout: RSS_FETCH_TIMEOUT_MS,
  headers: {
    "User-Agent": "TRNETHABER-Bot/1.0 (+https://trnethaber.vercel.app)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

export type FetchNewsItemResult =
  | {
      ok: true;
      saved: true;
      slug: string;
      title: string;
      sourceName: string;
      breaking?: boolean;
      publishedAt?: string;
    }
  | {
      ok: true;
      saved: false;
      reason: string;
      title?: string;
      sourceName: string;
    }
  | {
      ok: false;
      error: string;
      sourceName: string;
      title?: string;
    };

export type FetchNewsPipelineResult = {
  ok: boolean;
  /** Bu çalıştırmada işlenen kaynak sayısı (batch) */
  sourcesScanned: number;
  /** Veritabanındaki toplam aktif kaynak */
  sourcesTotal: number;
  candidatesChecked: number;
  savedCount: number;
  results: FetchNewsItemResult[];
  errors: string[];
};

/** Fisher-Yates — her cron farklı kaynaklardan başlasın */
export function shuffleRssSources<T>(sources: readonly T[]): T[] {
  const list = [...sources];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function limits() {
  const batchFromEnv =
    process.env.FETCH_NEWS_SOURCE_BATCH ??
    process.env.FETCH_NEWS_MAX_SOURCES ??
    "5";

  return {
    /** Karıştırılmış listeden işlenecek kaynak üst sınırı (Vercel timeout koruması) */
    sourceBatchSize: Math.min(
      2,
      Math.max(1, Number(batchFromEnv) || 1),
    ),
    maxSaved: Math.min(
      2,
      Math.max(1, Number(process.env.FETCH_NEWS_MAX_SAVED ?? 2) || 2),
    ),
  };
}

function inferBreaking(title: string): boolean {
  return /son dakika|flaş|flash|acil|kritik|breaking/i.test(title);
}

async function resolveCategoryId(
  source: RssSourceRow,
): Promise<{ id: string; slug: string } | null> {
  const supabase = createSupabaseAdminClient();
  const label = source.category?.trim();

  if (label) {
    const bySlug = await supabase
      .from("categories")
      .select("id, slug")
      .eq("slug", slugifyTitle(label))
      .maybeSingle();
    if (bySlug.data) return bySlug.data;

    const byName = await supabase
      .from("categories")
      .select("id, slug")
      .ilike("name", label)
      .maybeSingle();
    if (byName.data) return byName.data;
  }

  if (source.city?.trim()) {
    const il = TURKIYE_ILLER.find((i) => i.name === source.city.trim());
    if (il) {
      const yerel = await supabase
        .from("categories")
        .select("id, slug")
        .eq("slug", il.slug)
        .maybeSingle();
      if (yerel.data) return yerel.data;
    }
  }

  const fallback = await supabase
    .from("categories")
    .select("id, slug")
    .eq("slug", "gundem")
    .maybeSingle();

  return fallback.data ?? null;
}

async function buildWireFromItem(
  item: RssItem,
  source: RssSourceRow,
  cleanUrl?: string,
): Promise<AgencyWire> {
  const rawTitle = (item.title ?? "Başlıksız haber").trim();
  const link = item.link?.trim() || "";
  const canonicalUrl = cleanUrl ?? cleanRssSourceUrl(link);

  const scraped = link
    ? await scrapeArticlePage(link)
    : { imageUrls: [] as string[], fullText: "" };

  const summary =
    item.contentSnippet?.trim() ||
    stripHtml(item.content ?? "") ||
    stripHtml(item.summary ?? "") ||
    rawTitle;

  const rawBody =
    scraped.fullText.length > 100
      ? scraped.fullText
      : `${summary}\n\nKaynak: ${source.name}.`;

  return {
    id: item.guid ?? link ?? slugifyTitle(rawTitle),
    rawTitle,
    rawLead: rawBody.slice(0, 320),
    rawBody,
    categorySlug: "gundem",
    isBreaking: inferBreaking(rawTitle),
    sourceLabel: source.name,
    sourceUrl: canonicalUrl,
    imageUrl: scraped.imageUrls[0],
    imageUrls: scraped.imageUrls,
  };
}

function buildGeminiPrompt(wire: AgencyWire, source: RssSourceRow): string {
  const breakingHint = wire.isBreaking
    ? "NOT: Ham başlıkta son dakika / aciliyet ipucu var — is_breaking_news değerlendirmesinde bunu dikkate al."
    : "";
  return [
    "Ham haber verisini SEO JSON'a dönüştür.",
    "Sana verilen metnin içindeki menü yazıları, yorum uyarısı, çerez politikası gibi alakasız web sitesi arayüz metinlerini tamamen görmezden gel; yalnızca haberin ana konusuna odaklan.",
    `Kaynak: ${source.name}`,
    breakingHint,
    source.city ? `Şehir: ${source.city}` : "",
    source.category ? `Kategori: ${source.category}` : "",
    wire.sourceUrl ? `Orijinal URL: ${wire.sourceUrl}` : "",
    "",
    `Başlık: ${wire.rawTitle}`,
    `Özet: ${wire.rawLead}`,
    `Gövde:\n${wire.rawBody.slice(0, 12_000)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function persistArticle(params: {
  title: string;
  slug: string;
  spot_metni: string;
  content: string;
  kapak_gorseli: string;
  category_id: string;
  source_url?: string;
  seo_keywords: string;
  meta_description: string;
  is_breaking: boolean;
  published_at: string;
  city?: string | null;
  city_slug?: string | null;
  categorySlug?: string;
  categoryName?: string;
}): Promise<{ id: string; slug: string }> {
  const { waitedMs } = await awaitPublishJitter();
  console.info(`[fetch-news] Yayın gecikmesi: ${Math.round(waitedMs / 1000)} sn`);

  const yazar = assignReporterForArticle({
    title: params.title,
    lead: params.spot_metni,
    body: params.content,
    explicitCity: params.city,
    categorySlug: params.categorySlug,
    categoryName: params.categoryName,
  });

  const supabase = createSupabaseAdminClient();

  const content = stripArticleContentForPersist(params.content);

  const basePayload = {
    title: params.title,
    slug: params.slug,
    spot_metni: params.spot_metni,
    content,
    kapak_gorseli: params.kapak_gorseli,
    category_id: params.category_id,
    yazar,
    okuma_sayisi: "0 okuma",
    view_count: 0,
    is_breaking: params.is_breaking,
    published_at: params.published_at,
  };

  const cityValue = params.city?.trim() || null;
  const citySlugValue = params.city_slug?.trim() || null;

  const fullPayload = {
    ...basePayload,
    seo_keywords: params.seo_keywords,
    meta_description: params.meta_description,
    ...(params.source_url
      ? {
          source_url:
            cleanRssSourceUrl(params.source_url) || params.source_url.trim(),
        }
      : {}),
    ...(cityValue ? { city: cityValue } : {}),
    ...(citySlugValue ? { city_slug: citySlugValue } : {}),
  };

  let { data, error } = await supabase
    .from("articles")
    .insert(fullPayload)
    .select("id, slug")
    .single();

  if (error?.message?.includes("view_count")) {
    const { view_count: _v, ...withoutView } = basePayload;
    ({ data, error } = await supabase
      .from("articles")
      .insert(withoutView)
      .select("id, slug")
      .single());
  }

  if (error?.message?.includes("city_slug")) {
    const { city_slug: _s, ...withoutSlug } = fullPayload as typeof fullPayload & {
      city_slug?: string;
    };
    ({ data, error } = await supabase
      .from("articles")
      .insert(withoutSlug)
      .select("id, slug")
      .single());
  }

  if (error?.message?.includes("city")) {
    const { city: _c, city_slug: _s, ...withoutCity } = fullPayload as typeof fullPayload & {
      city?: string;
      city_slug?: string;
    };
    ({ data, error } = await supabase
      .from("articles")
      .insert(withoutCity)
      .select("id, slug")
      .single());
  }

  if (
    error &&
    (error.message?.includes("seo_keywords") ||
      error.message?.includes("meta_description") ||
      error.message?.includes("source_url"))
  ) {
    ({ data, error } = await supabase
      .from("articles")
      .insert(basePayload)
      .select("id, slug")
      .single());
  }

  if (error) {
    const dupReason = duplicateReasonFromPostgres(error);
    if (dupReason) {
      throw new Error(`duplicate_${dupReason}`);
    }
  }

  if (error || !data) {
    throw new Error(error?.message ?? "articles insert başarısız");
  }

  return { id: data.id, slug: data.slug };
}

function duplicateSkipMessage(reason: DuplicateReason): string {
  if (reason === "url") return DUPLICATE_URL_SKIP_MESSAGE;
  if (reason === "slug") return DUPLICATE_SLUG_SKIP_MESSAGE;
  return DUPLICATE_TITLE_SKIP_MESSAGE;
}

function duplicateSkipResult(
  reason: DuplicateReason,
  title: string,
  sourceName: string,
): FetchNewsItemResult {
  console.info(`[fetch-news] ${duplicateSkipMessage(reason)}: ${title}`);
  return {
    ok: true,
    saved: false,
    reason: `duplicate_${reason}`,
    title,
    sourceName,
  };
}

async function processCandidate(
  wire: AgencyWire,
  source: RssSourceRow,
  schedule: FetchNewsPublishSchedule,
  duplicateCache: ArticleDuplicateCache,
): Promise<FetchNewsItemResult> {
  try {
    const cleanUrl = cleanRssSourceUrl(wire.sourceUrl ?? "");

    const dupBeforeGemini = await findAggressiveDuplicate(
      {
        title: wire.rawTitle,
        slug: slugifyTitle(wire.rawTitle),
        sourceUrl: cleanUrl || wire.sourceUrl,
      },
      duplicateCache,
    );
    if (dupBeforeGemini) {
      return duplicateSkipResult(dupBeforeGemini, wire.rawTitle, source.name);
    }

    let gemini;
    try {
      gemini = await generateFetchNewsJson(
        buildGeminiPrompt(wire, source),
        wire.rawTitle,
      );
    } catch (err) {
      if (isGeminiBusyError(err)) {
        logGeminiBusy(err);
        return {
          ok: true,
          saved: false,
          reason: "gemini_busy",
          title: wire.rawTitle,
          sourceName: source.name,
        };
      }
      throw err;
    }

    const rssImages: string[] = [];
    if (wire.imageUrl?.trim()) rssImages.push(wire.imageUrl.trim());
    for (const u of wire.imageUrls ?? []) {
      if (u?.trim() && !rssImages.includes(u.trim())) rssImages.push(u.trim());
    }

    const imagePool = await buildNewsImagePool({
      rssImages,
      keywords: gemini.keywords,
      title: gemini.title,
      summary: gemini.summary,
      slugSeed: gemini.slug,
    });

    const cover = imagePool[0];
    if (!cover) {
      return {
        ok: false,
        error: "Görsel havuzu boş",
        sourceName: source.name,
        title: wire.rawTitle,
      };
    }

    const { html } = assembleFetchNewsHtml(gemini.blocks);

    const category = await resolveCategoryId(source);
    if (!category) {
      return {
        ok: false,
        error: "Kategori eşleşmedi",
        sourceName: source.name,
        title: gemini.title,
      };
    }

    const dupBeforeSave = await findAggressiveDuplicate(
      {
        title: gemini.title,
        slug: gemini.slug,
        sourceUrl: cleanUrl || wire.sourceUrl,
      },
      duplicateCache,
    );
    if (dupBeforeSave) {
      return duplicateSkipResult(dupBeforeSave, gemini.title, source.name);
    }

    const isBreakingNews =
      gemini.is_breaking_news || wire.isBreaking || inferBreaking(gemini.title);

    const publishedAt = isBreakingNews
      ? schedule.breakingPublishedAt()
      : schedule.nextNormalPublishedAt();

    const saved = await persistArticle({
      title: gemini.title,
      slug: gemini.slug,
      spot_metni: gemini.summary,
      content: html,
      kapak_gorseli: cover,
      category_id: category.id,
      source_url: cleanUrl || wire.sourceUrl,
      seo_keywords: gemini.keywords.join(", "),
      meta_description: normalizeMetaDescription(gemini.summary, gemini.title, 155),
      is_breaking: isBreakingNews,
      published_at: publishedAt,
      city: source.city?.trim() || null,
      city_slug: source.city_slug?.trim() || null,
      categorySlug: category.slug,
      categoryName: source.category?.trim() || undefined,
    });

    duplicateCache.register({
      title: gemini.title,
      slug: saved.slug,
      sourceUrl: cleanUrl || wire.sourceUrl,
    });

    return {
      ok: true,
      saved: true,
      slug: saved.slug,
      title: gemini.title,
      sourceName: source.name,
      breaking: isBreakingNews,
      publishedAt,
    };
  } catch (err) {
    if (isGeminiBusyError(err)) {
      logGeminiBusy(err);
      return {
        ok: true,
        saved: false,
        reason: "gemini_busy",
        title: wire.rawTitle,
        sourceName: source.name,
      };
    }

    const message = err instanceof Error ? err.message : "İşlem başarısız";
    const dupMatch = /^duplicate_(title|slug|url)$/.exec(message);
    if (dupMatch) {
      return {
        ok: true,
        saved: false,
        reason: message,
        title: wire.rawTitle,
        sourceName: source.name,
      };
    }
    console.error(`[fetch-news] ${source.name}:`, err);
    return {
      ok: false,
      error: message,
      sourceName: source.name,
      title: wire.rawTitle,
    };
  }
}

/**
 * Tek RSS kaynağını sırayla işler (Promise.all yok). Kaynak veya öğe hatası yukarı fırlatılmaz.
 */
export async function processRssSourceBatch(params: {
  source: RssSourceRow;
  maxSaved: number;
  schedule: FetchNewsPublishSchedule;
  duplicateCache: ArticleDuplicateCache;
  getSavedCount: () => number;
  onSaved: () => void;
  /** Yerel cron: feed başına 1 öğe (timeout koruması) */
  maxItemsPerFeed?: number;
}): Promise<{ results: FetchNewsItemResult[]; candidatesChecked: number; errors: string[] }> {
  const {
    source,
    maxSaved,
    schedule,
    duplicateCache,
    getSavedCount,
    onSaved,
    maxItemsPerFeed = 2,
  } = params;

  const results: FetchNewsItemResult[] = [];
  const errors: string[] = [];
  let candidatesChecked = 0;

  const feed = await parser.parseURL(source.url);
  const items = (feed.items ?? [])
    .filter((item) => item.title?.trim())
    .slice(0, maxItemsPerFeed);

  for (const item of items) {
    if (getSavedCount() >= maxSaved) break;
    candidatesChecked += 1;

    try {
      const rawLink = item.link?.trim() || "";
      const cleanUrl = cleanRssSourceUrl(rawLink);
      const rawTitle = item.title?.trim() ?? "";

      const dupEarly = await findAggressiveDuplicate(
        {
          title: rawTitle,
          slug: slugifyTitle(rawTitle),
          sourceUrl: cleanUrl || rawLink,
        },
        duplicateCache,
      );
      if (dupEarly) {
        results.push(duplicateSkipResult(dupEarly, rawTitle, source.name));
        continue;
      }

      const wire = await buildWireFromItem(item, source, cleanUrl || undefined);
      const outcome = await processCandidate(wire, source, schedule, duplicateCache);
      results.push(outcome);

      if (outcome.ok && outcome.saved) {
        onSaved();
      } else if (!outcome.ok) {
        errors.push(`${source.name}: ${outcome.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Haber öğesi işlenemedi";
      console.warn(`[fetch-news] Öğe atlandı (${source.name}):`, msg);
      results.push({
        ok: false,
        error: msg,
        sourceName: source.name,
        title: item.title?.trim(),
      });
    }
  }

  return { results, candidatesChecked, errors };
}

/**
 * Karanlık Fabrika — timeout korumalı RSS tarama
 * 1) Tüm aktif kaynaklar  2) Shuffle  3) İlk N kaynak (batch)  4) for…of + try/catch
 */
export async function runFetchNewsPipeline(): Promise<FetchNewsPipelineResult> {
  const { sourceBatchSize, maxSaved } = limits();

  const allActive = await getActiveRssSources();
  const sourcesTotal = allActive.length;

  if (sourcesTotal === 0) {
    return {
      ok: false,
      sourcesScanned: 0,
      sourcesTotal: 0,
      candidatesChecked: 0,
      savedCount: 0,
      results: [],
      errors: ["Aktif RSS kaynağı yok. /admin/kaynaklar üzerinden kaynak ekleyin."],
    };
  }

  const batch = shuffleRssSources(allActive).slice(0, sourceBatchSize);

  const results: FetchNewsItemResult[] = [];
  const errors: string[] = [];
  const schedule = new FetchNewsPublishSchedule();
  const duplicateCache = new ArticleDuplicateCache();
  await duplicateCache.warm();

  let candidatesChecked = 0;
  let savedCount = 0;

  console.info(
    `[fetch-news] ${sourcesTotal} aktif kaynak; bu turda ${batch.length} kaynak işlenecek (batch=${sourceBatchSize})`,
  );

  for (const source of batch) {
    if (savedCount >= maxSaved) {
      console.info("[fetch-news] maxSaved doldu, kalan kaynaklar atlanıyor.");
      break;
    }

    try {
      const pass = await processRssSourceBatch({
        source,
        maxSaved,
        schedule,
        duplicateCache,
        getSavedCount: () => savedCount,
        onSaved: () => {
          savedCount += 1;
        },
      });

      results.push(...pass.results);
      candidatesChecked += pass.candidatesChecked;
      errors.push(...pass.errors);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "RSS kaynağı okunamadı";
      console.warn(`[fetch-news] Kaynak atlandı (${source.name}):`, msg);
      errors.push(`${source.name}: ${msg}`);
      continue;
    }
  }

  return {
    ok: savedCount > 0 || errors.length === 0,
    sourcesScanned: batch.length,
    sourcesTotal,
    candidatesChecked,
    savedCount,
    results,
    errors,
  };
}
