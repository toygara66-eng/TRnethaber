import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugifyTitle } from "@/lib/slug";
import type { RssPickMeta } from "@/lib/bot/rss-fetcher";
import type { AgencyWire } from "@/lib/bot/types";

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
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

function normalizeSourceUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    let path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Son kayıtları tek sorguda belleğe alır — döngü içinde tekrarlı DB sorgusunu azaltır */
export class ArticleDuplicateCache {
  private sourceUrls = new Set<string>();
  private titles = new Set<string>();
  private slugs = new Set<string>();
  private warmed = false;

  async warm(limit = 800): Promise<void> {
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
    if (title) this.titles.add(normalizeTitle(title));

    const slug = input.slug?.trim()
      ? slugifyTitle(input.slug)
      : title
        ? slugifyTitle(title)
        : "";
    if (slug) this.slugs.add(slug);

    const url = input.sourceUrl?.trim();
    if (url) this.sourceUrls.add(normalizeSourceUrl(url));
  }

  checkMemory(input: DuplicateCheckInput): DuplicateReason | null {
    const url = input.sourceUrl?.trim();
    if (url && this.sourceUrls.has(normalizeSourceUrl(url))) return "url";

    const title = input.title?.trim();
    if (title && this.titles.has(normalizeTitle(title))) return "title";

    const slug = input.slug?.trim()
      ? slugifyTitle(input.slug)
      : title
        ? slugifyTitle(title)
        : "";
    if (slug && this.slugs.has(slug)) return "slug";

    return null;
  }

  /** Bellekte yoksa hedefli DB sorgusu (source_url unique index / title eşleşmesi) */
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

async function queryDuplicateInDatabase(
  input: DuplicateCheckInput,
): Promise<DuplicateReason | null> {
  const supabase = createSupabaseAdminClient();
  const url = input.sourceUrl?.trim();
  const title = input.title?.trim();
  const slug = input.slug?.trim()
    ? slugifyTitle(input.slug)
    : title
      ? slugifyTitle(title)
      : "";

  if (url) {
    const { data, error } = await supabase
      .from("articles")
      .select("id")
      .eq("source_url", url)
      .maybeSingle();

    if (!error && data) return "url";
  }

  if (title) {
    const { data, error } = await supabase
      .from("articles")
      .select("id")
      .eq("title", title)
      .maybeSingle();

    if (!error && data) return "title";
  }

  if (slug) {
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

export async function findDuplicateReason(
  wire: AgencyWire,
  cache?: ArticleDuplicateCache,
): Promise<DuplicateReason | null> {
  const checker = cache ?? new ArticleDuplicateCache();
  if (!cache) await checker.warm();

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
  return checker.findDuplicate(input);
}

export async function assertNotDuplicateArticle(
  wire: AgencyWire,
  rss?: RssPickMeta,
  cache?: ArticleDuplicateCache,
): Promise<void> {
  const dup = await findDuplicateReason(wire, cache);
  if (dup) throw new DuplicateArticleError(dup, wire, rss);
}
