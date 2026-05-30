import { cleanRssSourceUrl, urlsMatchForDuplicate } from "@/lib/bot/source-url";
import {
  isSimilarTitle,
  normalizeTitleKey,
  TITLE_SIMILARITY_THRESHOLD,
} from "@/lib/bot/title-similarity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugifyTitle } from "@/lib/slug";
import type { RssPickMeta } from "@/lib/bot/rss-fetcher";
import type { AgencyWire } from "@/lib/bot/types";

/** Gemini öncesi sessiz atlama — log / API yanıtı */
export const DUPLICATE_URL_SKIP_MESSAGE = "Bu haber zaten mevcut";
export const DUPLICATE_TITLE_SKIP_MESSAGE = "Benzer başlık zaten mevcut";

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

function normalizeTitle(title: string): string {
  return normalizeTitleKey(title);
}

function normalizeSourceUrl(url: string): string {
  return cleanRssSourceUrl(url);
}

const DUPLICATE_CACHE_WARM_LIMIT = 1200;

/** Son kayıtları tek sorguda belleğe alır — döngü içinde tekrarlı DB sorgusunu azaltır */
export class ArticleDuplicateCache {
  private sourceUrls = new Set<string>();
  private titles = new Set<string>();
  private titleKeys: string[] = [];
  private slugs = new Set<string>();
  private warmed = false;

  async warm(limit = DUPLICATE_CACHE_WARM_LIMIT): Promise<void> {
    if (this.warmed) return;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("articles")
      .select("title, slug, source_url")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[duplicate-cache] warm failed:", error.message);
      return;
    }

    for (const row of data ?? []) {
      this.register({
        title: row.title ?? "",
        slug: row.slug ?? "",
        sourceUrl: row.source_url,
      });
    }

    this.warmed = true;
  }

  register(input: DuplicateCheckInput): void {
    const title = input.title?.trim();
    if (title) {
      this.titles.add(normalizeTitle(title));
      const key = normalizeTitleKey(title);
      if (key && !this.titleKeys.includes(key)) {
        this.titleKeys.push(key);
      }
    }

    const slug = input.slug?.trim()
      ? slugifyTitle(input.slug)
      : title
        ? slugifyTitle(title)
        : "";
    if (slug) this.slugs.add(slug);

    const url = input.sourceUrl?.trim();
    if (url) this.sourceUrls.add(normalizeSourceUrl(url));
  }

  private checkTitleSimilarityMemory(title: string): boolean {
    const candidate = title.trim();
    if (!candidate) return false;

    for (const existing of this.titleKeys) {
      if (isSimilarTitle(candidate, existing)) return true;
    }
    if (this.titles.has(normalizeTitle(candidate))) return true;
    return false;
  }

  /** Yalnızca kanonik kaynak URL — Gemini öncesi kalkan */
  checkSourceUrlMemory(sourceUrl: string): boolean {
    const clean = normalizeSourceUrl(sourceUrl);
    return Boolean(clean && this.sourceUrls.has(clean));
  }

  registerSourceUrl(sourceUrl: string): void {
    const clean = normalizeSourceUrl(sourceUrl);
    if (clean) this.sourceUrls.add(clean);
  }

  async hasSourceUrl(sourceUrl: string): Promise<boolean> {
    const clean = normalizeSourceUrl(sourceUrl);
    if (!clean) return false;

    if (this.checkSourceUrlMemory(clean)) return true;

    const fromDb = await querySourceUrlInDatabase(clean);
    if (fromDb) {
      this.sourceUrls.add(clean);
      return true;
    }
    return false;
  }

  async hasSimilarTitle(title: string): Promise<boolean> {
    const candidate = title.trim();
    if (!candidate) return false;

    if (this.checkTitleSimilarityMemory(candidate)) return true;

    const fromDb = await querySimilarTitleInDatabase(candidate);
    if (fromDb) {
      this.register({ title: candidate });
      return true;
    }
    return false;
  }

  checkMemory(input: DuplicateCheckInput): DuplicateReason | null {
    const url = input.sourceUrl?.trim();
    if (url && this.sourceUrls.has(normalizeSourceUrl(url))) return "url";

    const title = input.title?.trim();
    if (title) {
      if (this.titles.has(normalizeTitle(title))) return "title";
      if (this.checkTitleSimilarityMemory(title)) return "title";
    }

    const slug = input.slug?.trim()
      ? slugifyTitle(input.slug)
      : title
        ? slugifyTitle(title)
        : "";
    if (slug && this.slugs.has(slug)) return "slug";

    return null;
  }

  /** Bellekte yoksa hedefli DB sorgusu */
  async findDuplicate(input: DuplicateCheckInput): Promise<DuplicateReason | null> {
    const cached = this.checkMemory(input);
    if (cached) return cached;

    const fromDb = await queryDuplicateInDatabase(input);
    if (fromDb) {
      this.register(input);
      return fromDb;
    }
    return null;
  }
}

async function querySourceUrlInDatabase(cleanUrl: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();

  const exact = await supabase
    .from("articles")
    .select("id, source_url")
    .eq("source_url", cleanUrl)
    .maybeSingle();

  if (!exact.error && exact.data) return true;

  const host = (() => {
    try {
      return new URL(cleanUrl).hostname;
    } catch {
      return "";
    }
  })();

  if (host) {
    const { data: hostRows, error: hostError } = await supabase
      .from("articles")
      .select("source_url")
      .ilike("source_url", `%${host}%`)
      .not("source_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(40);

    if (!hostError && hostRows) {
      for (const row of hostRows) {
        if (row.source_url && urlsMatchForDuplicate(row.source_url, cleanUrl)) {
          return true;
        }
      }
    }
  }

  const { data: candidates, error: prefixError } = await supabase
    .from("articles")
    .select("source_url")
    .ilike("source_url", `${cleanUrl}%`)
    .limit(12);

  if (!prefixError && candidates) {
    for (const row of candidates) {
      if (row.source_url && urlsMatchForDuplicate(row.source_url, cleanUrl)) {
        return true;
      }
    }
  }

  return false;
}

async function querySimilarTitleInDatabase(title: string): Promise<boolean> {
  const candidate = title.trim();
  if (!candidate) return false;

  const supabase = createSupabaseAdminClient();
  const key = normalizeTitleKey(candidate);
  if (!key) return false;

  const { data: exact, error: exactError } = await supabase
    .from("articles")
    .select("id")
    .eq("title", candidate)
    .maybeSingle();

  if (!exactError && exact) return true;

  const probe =
    key.length >= 12 ? key.slice(0, Math.min(48, key.length)) : key.slice(0, Math.min(8, key.length));

  if (probe.length < 4) return false;

  const { data: rows, error } = await supabase
    .from("articles")
    .select("title")
    .ilike("title", `%${probe}%`)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error || !rows) return false;

  for (const row of rows) {
    if (row.title && isSimilarTitle(candidate, row.title)) {
      return true;
    }
  }

  return false;
}

async function queryDuplicateInDatabase(
  input: DuplicateCheckInput,
): Promise<DuplicateReason | null> {
  const url = input.sourceUrl?.trim();
  const cleanUrl = url ? normalizeSourceUrl(url) : "";
  const title = input.title?.trim();
  const slug = input.slug?.trim()
    ? slugifyTitle(input.slug)
    : title
      ? slugifyTitle(title)
      : "";

  if (cleanUrl) {
    if (await querySourceUrlInDatabase(cleanUrl)) return "url";
  }

  if (title) {
    if (await querySimilarTitleInDatabase(title)) return "title";
  }

  if (slug) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) return "slug";
  }

  return null;
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

/** Gemini / scrape öncesi — kanonik kaynak URL */
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

/** Gemini öncesi / sonrası — %90+ benzer başlık */
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

export async function findDuplicateReason(
  wire: AgencyWire,
  cache?: ArticleDuplicateCache,
): Promise<DuplicateReason | null> {
  const checker = cache ?? new ArticleDuplicateCache();
  if (!cache) await checker.warm();

  const urlDup = await findDuplicateBySourceUrlOnly(wire.sourceUrl ?? "", checker);
  if (urlDup) return "url";

  const titleDup = await findDuplicateByTitleSimilar(wire.rawTitle, checker);
  if (titleDup) return "title";

  return checker.findDuplicate({
    title: wire.rawTitle,
    slug: slugifyTitle(wire.rawTitle),
    sourceUrl: wire.sourceUrl,
  });
}

export async function findDuplicateForSave(
  input: DuplicateCheckInput,
  cache?: ArticleDuplicateCache,
): Promise<DuplicateReason | null> {
  const checker = cache ?? new ArticleDuplicateCache();
  if (!cache) await checker.warm();

  if (input.title?.trim()) {
    const similar = await checker.hasSimilarTitle(input.title);
    if (similar) return "title";
  }

  return checker.findDuplicate(input);
}

export async function assertNotDuplicateArticle(
  wire: AgencyWire,
  rss?: RssPickMeta,
  cache?: ArticleDuplicateCache,
): Promise<void> {
  const checker = cache ?? new ArticleDuplicateCache();
  if (!cache) await checker.warm();

  await assertSourceUrlNotDuplicate(wire.sourceUrl ?? "", wire, rss, checker);
  await assertTitleNotDuplicate(wire.rawTitle, wire, rss, checker);

  const dup = await checker.findDuplicate({
    title: wire.rawTitle,
    slug: slugifyTitle(wire.rawTitle),
    sourceUrl: wire.sourceUrl,
  });
  if (dup) {
    throw new DuplicateArticleError(dup, wire, rss);
  }
}

export { TITLE_SIMILARITY_THRESHOLD };
