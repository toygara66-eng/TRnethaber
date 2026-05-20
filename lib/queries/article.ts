import { resolveReadTimeLabel, resolveViewCountLabel } from "@/lib/articles/labels";
import { resolveCoverImageSrc } from "@/lib/images/cover";
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
    msg.includes("source_url")
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
  const published = row.published_at ?? row.created_at ?? new Date().toISOString();
  const modified = row.updated_at ?? published;

  return {
    slug: row.slug,
    title: row.title,
    dek: row.spot_metni ?? "",
    category: cat?.name ?? "",
    categorySlug: cat?.slug ?? "",
    readTimeLabel: resolveReadTimeLabel(row.content ?? ""),
    viewCountLabel: resolveViewCountLabel(row.okuma_sayisi, row.slug),
    authorName: row.yazar ?? "TRNETHABER Editör Masası",
    publishedAt: published,
    modifiedAt: modified,
    imageSrc: resolveCoverImageSrc(row.kapak_gorseli),
    imageAlt: `${row.title} kapak görseli, soyut, yüz ve yazı yok`,
    metaDescription: row.meta_description?.trim() || row.spot_metni?.trim() || "",
    seoKeywords: (row.seo_keywords ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    blocks: contentToBlocks(row.content ?? ""),
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
    .select(ARTICLE_DETAIL_SELECT_BASE)
    .eq("slug", slug)
    .maybeSingle();

  if (base.error) {
    console.error("[getArticleBySlug]", base.error);
    return null;
  }

  return (base.data as ArticleRow) ?? null;
}

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  try {
    const row = await fetchArticleRowBySlug(slug);
    if (!row) return null;
    return mapArticleDetail(row);
  } catch (err) {
    console.error("[getArticleBySlug]", err);
    return null;
  }
}

export async function getAllArticleSlugs(): Promise<string[]> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from("articles").select("slug");

    if (error || !data) return [];
    return data.map((r) => r.slug);
  } catch {
    return [];
  }
}
