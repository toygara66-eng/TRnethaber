import { resolveDisplayAuthor } from "@/lib/articles/display-author";
import { stripHtmlTags } from "@/lib/articles/html-content";
import {
  filterPublishedRows,
  isMissingIsPublishedColumn,
  isRowPublished,
  stripSelectColumns,
} from "@/lib/articles/publish";
import { resolveReadTimeLabel } from "@/lib/articles/labels";
import { resolveCoverImageSrc } from "@/lib/images/cover";
import { safeIsoDate, safeSlug, safeText } from "@/lib/safe-display";
import { createSupabaseClient } from "@/lib/supabase";
import type { ArticleRow } from "@/lib/supabase/rows";
import type { ArticleBlock, ArticleDetail } from "@/lib/types/article";

const ARTICLE_DETAIL_SELECT_BASE = `
  id,
  title,
  slug,
  content,
  spot_metni,
  kapak_gorseli,
  okuma_sayisi,
  yazar,
  published_at,
  created_at,
  updated_at,
  categories (
    id,
    slug,
    name
  )
`;

const ARTICLE_DETAIL_SELECT_FULL = `
  id,
  title,
  slug,
  content,
  spot_metni,
  kapak_gorseli,
  okuma_sayisi,
  seo_keywords,
  meta_description,
  yazar,
  published_at,
  created_at,
  updated_at,
  categories (
    id,
    slug,
    name
  )
`;

function isMissingColumnError(error: { message?: string; code?: string }): boolean {
  const msg = error.message ?? "";
  return (
    error.code === "42703" ||
    msg.includes("does not exist") ||
    msg.includes("seo_keywords") ||
    msg.includes("meta_description") ||
    msg.includes("is_published")
  );
}

function resolveCategory(row: ArticleRow) {
  const c = row.categories;
  if (!c) return null;
  return Array.isArray(c) ? c[0] ?? null : c;
}

function contentToBlocks(content: string): ArticleBlock[] {
  const parts = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0 && content.trim()) {
    return [{ type: "paragraph", text: content.trim() }];
  }
  return parts.map((text) => ({ type: "paragraph", text }));
}

function mapArticleDetail(row: ArticleRow): ArticleDetail {
  const cat = resolveCategory(row);
  const title = safeText(row.title, "Haber");
  const slug = safeSlug(row.slug, "haber");
  const published = safeIsoDate(row.published_at ?? row.created_at);
  const modified = safeIsoDate(row.updated_at ?? published);
  const content = row.content ?? "";

  return {
    id: safeText(row.id, slug),
    slug,
    title,
    dek: safeText(row.spot_metni),
    category: safeText(cat?.name, "Gündem"),
    categorySlug: safeSlug(cat?.slug, "gundem"),
    readTimeLabel: resolveReadTimeLabel(stripHtmlTags(content)),
    authorName: resolveDisplayAuthor(row.yazar, cat?.slug ?? "", cat?.name),
    publishedAt: published,
    modifiedAt: modified,
    imageSrc: resolveCoverImageSrc(row.kapak_gorseli),
    imageAlt: `${title} kapak görseli`,
    metaDescription: safeText(row.meta_description) || safeText(row.spot_metni),
    seoKeywords: (row.seo_keywords ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    contentHtml: content,
    blocks: contentToBlocks(content),
  };
}

async function fetchArticleRowBySlug(slug: string): Promise<ArticleRow | null> {
  const supabase = createSupabaseClient();

  const full = await supabase
    .from("articles")
    .select(ARTICLE_DETAIL_SELECT_FULL)
    .eq("slug", slug)
    .maybeSingle();

  if (!full.error && full.data) {
    return full.data as ArticleRow;
  }

  if (full.error && !isMissingColumnError(full.error)) {
    console.error("[getArticleBySlug]", full.error);
    return null;
  }

  const base = await supabase
    .from("articles")
    .select(
      stripSelectColumns(
        ARTICLE_DETAIL_SELECT_FULL,
        "seo_keywords",
        "meta_description",
        "is_published",
      ),
    )
    .eq("slug", slug)
    .maybeSingle();

  if (base.error) {
    console.error("[getArticleBySlug]", base.error);
    return null;
  }

  return (base.data as unknown as ArticleRow) ?? null;
}

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  try {
    const row = await fetchArticleRowBySlug(slug);
    if (!row || !isRowPublished(row)) return null;
    return mapArticleDetail(row);
  } catch (err) {
    console.error("[getArticleBySlug]", err);
    return null;
  }
}

export async function getNextPublishedArticle(
  currentId: string,
): Promise<ArticleDetail | null> {
  try {
    const supabase = createSupabaseClient();

    const current = await supabase
      .from("articles")
      .select("id, published_at, created_at")
      .eq("id", currentId)
      .maybeSingle();

    if (current.error || !current.data) return null;

    const anchor =
      (current.data as { published_at: string | null; created_at: string }).published_at ??
      (current.data as { created_at: string }).created_at;

    let result = await filterPublishedRows(
      supabase.from("articles").select(ARTICLE_DETAIL_SELECT_FULL),
    )
      .neq("id", currentId)
      .lt("published_at", anchor)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(12);

    if (result.error && isMissingColumnError(result.error)) {
      const fallback = await filterPublishedRows(
        supabase
          .from("articles")
          .select(stripSelectColumns(ARTICLE_DETAIL_SELECT_BASE, "seo_keywords", "meta_description")),
      )
        .neq("id", currentId)
        .lt("published_at", anchor)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(12);

      if (fallback.error) {
        console.error("[getNextPublishedArticle]", fallback.error);
        return null;
      }

      const rows = (fallback.data ?? []) as unknown as ArticleRow[];
      const row = rows.find((r) => isRowPublished(r));
      return row ? mapArticleDetail(row) : null;
    }

    if (result.error) {
      console.error("[getNextPublishedArticle]", result.error);
      return null;
    }

    const rows = (result.data ?? []) as unknown as ArticleRow[];
    const next = rows.find((row) => isRowPublished(row));
    return next ? mapArticleDetail(next) : null;
  } catch (err) {
    console.error("[getNextPublishedArticle]", err);
    return null;
  }
}

export async function getAllArticleSlugs(): Promise<string[]> {
  try {
    const supabase = createSupabaseClient();
    let { data, error } = await filterPublishedRows(
      supabase.from("articles").select("slug"),
    );

    if (error || !data) return [];
    return data.map((r) => r.slug);
  } catch {
    return [];
  }
}
