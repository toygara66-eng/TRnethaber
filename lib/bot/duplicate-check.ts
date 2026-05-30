import { cleanRssSourceUrl, urlsMatchForDuplicate } from "@/lib/bot/source-url";
import {
  isSimilarTitle,
  normalizeTitleAggressive,
  TITLE_FUZZY_RECENT_LIMIT,
  TITLE_SIMILARITY_THRESHOLD,
} from "@/lib/bot/title-similarity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugifyTitle } from "@/lib/slug";
import type { RssPickMeta } from "@/lib/bot/rss-fetcher";
import type { AgencyWire } from "@/lib/bot/types";

/** Gemini öncesi sessiz atlama — log / API yanıtı */
export const DUPLICATE_URL_SKIP_MESSAGE = "Bu haber zaten mevcut";
export const DUPLICATE_TITLE_SKIP_MESSAGE = "Benzer başlık zaten mevcut";
export const DUPLICATE_SLUG_SKIP_MESSAGE = "Aynı slug zaten mevcut";

export type DuplicateReason = "title" | "slug" | "url";

export type DuplicateCheckInput = {
  title: string;
  slug?: string;
  sourceUrl?: string | null;
};

export class DuplicateArticleError extends Error {
  readonly reason: DuplicateReason;
  readonly wire?: AgencyWire;
  readonly rss?: RssPickMeta;

  constructor(reason: DuplicateReason, wire?: AgencyWire, rss?: RssPickMeta) {
    super(`Duplicate haber (${reason}): ${wire?.rawTitle ?? "kayıt"}`);
    this.name = "DuplicateArticleError";
    this.reason = reason;
    this.wire = wire;
    this.rss = rss;
  }
}

function normalizeSourceUrl(url: string): string {
  return cleanRssSourceUrl(url);
}

function resolveSlug(input: DuplicateCheckInput): string {
  if (input.slug?.trim()) return slugifyTitle(input.slug);
  if (input.title?.trim()) return slugifyTitle(input.title);
  return "";
}

const URL_SLUG_CACHE_WARM_LIMIT = 400;

/**
 * 3 katmanlı agresif duplicate önbelleği:
 * 1) Temiz source_url
 * 2) slug
 * 3) Son 50 başlık — agresif normalize + %85 fuzzy
 */
export class ArticleDuplicateCache {
  private sourceUrls = new Set<string>();
  private slugs = new Set<string>();
  private recentTitleFingerprints: string[] = [];
  private warmed = false;

  async warm(
    urlSlugLimit = URL_SLUG_CACHE_WARM_LIMIT,
    titleLimit = TITLE_FUZZY_RECENT_LIMIT,
  ): Promise<void> {
    if (this.warmed) return;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("articles")
      .select("title, slug, source_url")
      .order("created_at", { ascending: false })
      .limit(Math.max(urlSlugLimit, titleLimit));

    if (error) {
      console.warn("[duplicate-cache] warm failed:", error.message);
      return;
    }

    const rows = data ?? [];
    this.recentTitleFingerprints = [];

    for (let i = 0; i < Math.min(titleLimit, rows.length); i++) {
      const fp = normalizeTitleAggressive(rows[i]?.title ?? "");
      if (fp) this.recentTitleFingerprints.push(fp);
    }

    for (const row of rows) {
      this.register({
        title: row.title ?? "",
        slug: row.slug ?? "",
        sourceUrl: row.source_url,
      }, false);
    }

    this.warmed = true;
  }

  register(input: DuplicateCheckInput, pushTitleFingerprint = true): void {
    const slug = resolveSlug(input);
    if (slug) this.slugs.add(slug);

    const url = input.sourceUrl?.trim();
    if (url) this.sourceUrls.add(normalizeSourceUrl(url));

    if (pushTitleFingerprint) {
      const title = input.title?.trim();
      if (title) {
        const fp = normalizeTitleAggressive(title);
        if (fp) {
          this.recentTitleFingerprints.unshift(fp);
          if (this.recentTitleFingerprints.length > TITLE_FUZZY_RECENT_LIMIT) {
            this.recentTitleFingerprints.length = TITLE_FUZZY_RECENT_LIMIT;
          }
        }
      }
    }
  }

  private checkTitleAgainstRecentFingerprints(title: string): boolean {
    const candidateFp = normalizeTitleAggressive(title);
    if (!candidateFp) return false;

    for (const existingFp of this.recentTitleFingerprints) {
      if (candidateFp === existingFp) return true;
      if (isSimilarTitle(candidateFp, existingFp, TITLE_SIMILARITY_THRESHOLD)) {
        return true;
      }
    }
    return false;
  }

  checkSourceUrlMemory(sourceUrl: string): boolean {
    const clean = normalizeSourceUrl(sourceUrl);
    return Boolean(clean && this.sourceUrls.has(clean));
  }

  checkSlugMemory(slug: string): boolean {
    const key = slugifyTitle(slug);
    return Boolean(key && this.slugs.has(key));
  }

  async hasSourceUrl(sourceUrl: string): Promise<boolean> {
    const clean = normalizeSourceUrl(sourceUrl);
    if (!clean) return false;

    if (this.checkSourceUrlMemory(clean)) return true;
    return querySourceUrlInDatabase(clean);
  }

  async hasDuplicateSlug(slug: string): Promise<boolean> {
    const key = slugifyTitle(slug);
    if (!key) return false;

    if (this.checkSlugMemory(key)) return true;
    return querySlugInDatabase(key);
  }

  async hasSimilarTitle(title: string): Promise<boolean> {
    const candidate = title.trim();
    if (!candidate) return false;

    if (this.checkTitleAgainstRecentFingerprints(candidate)) return true;
    return querySimilarTitleInDatabase(candidate);
  }

  /**
   * Agresif 3 katmanlı kontrol sırası: URL → slug → başlık (son 50)
   */
  async assertAggressiveDuplicate(
    input: DuplicateCheckInput,
  ): Promise<DuplicateReason | null> {
    const url = input.sourceUrl?.trim();
    if (url && (await this.hasSourceUrl(url))) {
      this.registerSourceUrl(url);
      return "url";
    }

    const slug = resolveSlug(input);
    if (slug && (await this.hasDuplicateSlug(slug))) {
      return "slug";
    }

    const title = input.title?.trim();
    if (title && (await this.hasSimilarTitle(title))) {
      return "title";
    }

    return null;
  }

  registerSourceUrl(sourceUrl: string): void {
    const clean = normalizeSourceUrl(sourceUrl);
    if (clean) this.sourceUrls.add(clean);
  }

  async findDuplicate(input: DuplicateCheckInput): Promise<DuplicateReason | null> {
    const reason = await this.assertAggressiveDuplicate(input);
    if (reason) {
      this.register(input);
      return reason;
    }
    return null;
  }
}

async function querySlugInDatabase(slug: string): Promise<boolean> {
  const key = slugifyTitle(slug);
  if (!key) return false;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", key)
    .maybeSingle();

  return !error && Boolean(data);
}

async function querySourceUrlInDatabase(cleanUrl: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();

  const exact = await supabase
    .from("articles")
    .select("id, source_url")
    .eq("source_url", cleanUrl)
    .maybeSingle();

  if (!exact.error && exact.data) return true;

  const { data: recentRows, error: recentError } = await supabase
    .from("articles")
    .select("source_url")
    .not("source_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(120);

  if (!recentError && recentRows) {
    for (const row of recentRows) {
      if (row.source_url && urlsMatchForDuplicate(row.source_url, cleanUrl)) {
        return true;
      }
    }
  }

  return false;
}

/** Son 50 haber başlığı — agresif normalize + %85 fuzzy */
async function querySimilarTitleInDatabase(title: string): Promise<boolean> {
  const candidate = title.trim();
  if (!candidate) return false;

  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("articles")
    .select("title")
    .order("created_at", { ascending: false })
    .limit(TITLE_FUZZY_RECENT_LIMIT);

  if (error || !rows) return false;

  for (const row of rows) {
    if (row.title && isSimilarTitle(candidate, row.title, TITLE_SIMILARITY_THRESHOLD)) {
      return true;
    }
  }

  return false;
}

export function duplicateReasonFromPostgres(error: {
  code?: string;
  message?: string;
  details?: string;
}): DuplicateReason | null {
  if (error.code !== "23505") return null;
  const blob = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if (blob.includes("source_url")) return "url";
  if (blob.includes("title")) return "title";
  if (blob.includes("slug")) return "slug";
  return "slug";
}

export async function findDuplicateBySourceUrlOnly(
  sourceUrl: string,
  cache?: ArticleDuplicateCache,
): Promise<boolean> {
  const clean = cleanRssSourceUrl(sourceUrl);
  if (!clean) return false;

  const checker = cache ?? new ArticleDuplicateCache();
  if (!cache) await checker.warm();

  return checker.hasSourceUrl(clean);
}

export async function findDuplicateByTitleSimilar(
  title: string,
  cache?: ArticleDuplicateCache,
): Promise<boolean> {
  const candidate = title.trim();
  if (!candidate) return false;

  const checker = cache ?? new ArticleDuplicateCache();
  if (!cache) await checker.warm();

  return checker.hasSimilarTitle(candidate);
}

export async function findDuplicateBySlug(
  slug: string,
  cache?: ArticleDuplicateCache,
): Promise<boolean> {
  const checker = cache ?? new ArticleDuplicateCache();
  if (!cache) await checker.warm();
  return checker.hasDuplicateSlug(slug);
}

/** Kayıt öncesi — URL + slug + son 50 başlık fuzzy */
export async function findAggressiveDuplicate(
  input: DuplicateCheckInput,
  cache?: ArticleDuplicateCache,
): Promise<DuplicateReason | null> {
  const checker = cache ?? new ArticleDuplicateCache();
  if (!cache) await checker.warm();
  return checker.assertAggressiveDuplicate(input);
}

export async function findDuplicateForSave(
  input: DuplicateCheckInput,
  cache?: ArticleDuplicateCache,
): Promise<DuplicateReason | null> {
  return findAggressiveDuplicate(input, cache);
}

export async function assertSourceUrlNotDuplicate(
  sourceUrl: string,
  wire?: AgencyWire,
  rss?: RssPickMeta,
  cache?: ArticleDuplicateCache,
): Promise<void> {
  const exists = await findDuplicateBySourceUrlOnly(sourceUrl, cache);
  if (exists) {
    throw new DuplicateArticleError("url", wire, rss);
  }
}

export async function assertTitleNotDuplicate(
  title: string,
  wire?: AgencyWire,
  rss?: RssPickMeta,
  cache?: ArticleDuplicateCache,
): Promise<void> {
  const exists = await findDuplicateByTitleSimilar(title, cache);
  if (exists) {
    throw new DuplicateArticleError("title", wire, rss);
  }
}

export async function assertNotDuplicateArticle(
  wire: AgencyWire,
  rss?: RssPickMeta,
  cache?: ArticleDuplicateCache,
): Promise<void> {
  const checker = cache ?? new ArticleDuplicateCache();
  if (!cache) await checker.warm();

  const reason = await checker.assertAggressiveDuplicate({
    title: wire.rawTitle,
    slug: slugifyTitle(wire.rawTitle),
    sourceUrl: wire.sourceUrl,
  });

  if (reason) {
    throw new DuplicateArticleError(reason, wire, rss);
  }
}

export {
  TITLE_SIMILARITY_THRESHOLD,
  TITLE_FUZZY_RECENT_LIMIT,
  normalizeTitleAggressive,
};
