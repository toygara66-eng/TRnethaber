import { isMissingHeadlineColumn } from "@/lib/articles/headline-automation";
import { isRowPublished } from "@/lib/articles/publish";
import {
  isMissingSocialSharedColumn,
  parseSocialShared,
  type SocialSharedMap,
} from "@/lib/articles/social-shared";
import { coerceViewCount, isMissingViewCountColumn } from "@/lib/articles/view-count-db";
import { isMissingDbColumn } from "@/lib/queries/categories-shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseClient } from "@/lib/supabase";

export type AdminArticleRow = {
  id: string;
  title: string;
  slug: string;
  view_count: number;
  importance_score: number | null;
  is_breaking: boolean;
  /** Ana manşet (hero) */
  is_headline: boolean;
  /** Üst manşet şeridi */
  is_top_headline: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  social_shared: SocialSharedMap;
};

export type AdminCategoryOption = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
};

export type AdminArticlesSort = "newest" | "most_read";

export type AdminArticlesQueryResult = {
  articles: AdminArticleRow[];
  error: string | null;
};

const ADMIN_SELECT_WITH_HEADLINES = `
  id,
  title,
  slug,
  view_count,
  importance_score,
  is_breaking,
  is_headline,
  is_top_headline,
  is_manset,
  is_ust_manset,
  is_published,
  published_at,
  created_at,
  category_id,
  social_shared,
  categories ( name, slug )
`;

const ADMIN_SELECT_WITH_SOCIAL = `
  id,
  title,
  slug,
  view_count,
  is_breaking,
  is_published,
  published_at,
  created_at,
  category_id,
  social_shared,
  categories ( name, slug )
`;

const ADMIN_SELECT_SAFE = `
  id,
  title,
  slug,
  view_count,
  is_breaking,
  is_published,
  published_at,
  created_at,
  category_id,
  categories ( name, slug )
`;

const ADMIN_SELECT_MINIMAL = `
  id,
  title,
  slug,
  is_breaking,
  published_at,
  created_at,
  category_id,
  categories ( name, slug )
`;

function orderAdminArticles<T extends { order: (col: string, opts: { ascending: boolean; nullsFirst: boolean }) => T }>(
  query: T,
  sort: AdminArticlesSort,
): T {
  return query.order(
    sort === "most_read" ? "view_count" : "created_at",
    { ascending: false, nullsFirst: false },
  );
}

export async function getAdminArticles(
  sort: AdminArticlesSort = "newest",
): Promise<AdminArticlesQueryResult> {
  try {
    const supabase = createSupabaseAdminClient();

    const attempts: { select: string; label: string }[] = [
      { select: ADMIN_SELECT_WITH_HEADLINES, label: "full" },
      { select: ADMIN_SELECT_WITH_SOCIAL, label: "without_headline_cols" },
      { select: ADMIN_SELECT_SAFE, label: "without_social" },
      { select: ADMIN_SELECT_MINIMAL, label: "minimal" },
    ];

    let lastError: string | null = null;

    for (const attempt of attempts) {
      const { data, error } = await orderAdminArticles(
        supabase.from("articles").select(attempt.select),
        sort,
      );

      if (error) {
        lastError = error.message ?? "Supabase sorgu hatası";
        const expectedFallback =
          isMissingHeadlineColumn(error.message) ||
          isMissingSocialSharedColumn(error.message) ||
          isMissingViewCountColumn(error.message) ||
          isMissingDbColumn(error, "is_published") ||
          isMissingDbColumn(error, "category_id");
        if (expectedFallback) {
          console.warn(`[getAdminArticles] ${attempt.label} şema yedeği:`, error.message);
        } else {
          console.error(`[getAdminArticles] ${attempt.label}:`, error);
        }
        continue;
      }

      if (!data) {
        lastError = "Supabase boş yanıt döndü";
        console.error(`[getAdminArticles] ${attempt.label}: data null`);
        continue;
      }

      const rows = (data as unknown as Parameters<typeof mapAdminArticleRow>[0][]).map((row) =>
        mapAdminArticleRow(row, {
          viewCount: coerceViewCount((row as { view_count?: unknown }).view_count),
          isPublished: (row as { is_published?: boolean | null }).is_published !== false,
        }),
      );

      return { articles: applyAdminArticlesSort(rows, sort), error: null };
    }

    const fallback = await getAdminArticlesFallback(sort);
    if (fallback.articles.length > 0) {
      return fallback;
    }

    return { articles: [], error: lastError ?? "Haberler yüklenemedi" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[getAdminArticles] exception:", err);
    const fallback = await getAdminArticlesFallback(sort);
    if (fallback.articles.length > 0) {
      return fallback;
    }
    return { articles: [], error: message };
  }
}

function applyAdminArticlesSort(
  rows: AdminArticleRow[],
  sort: AdminArticlesSort,
): AdminArticleRow[] {
  if (sort === "most_read") {
    return [...rows].sort((a, b) => b.view_count - a.view_count);
  }
  return rows;
}

function mapAdminArticleRow(
  row: {
    id: string;
    title: string;
    slug: string;
    is_breaking: boolean | null;
    importance_score?: number | null;
    is_headline?: boolean | null;
    is_top_headline?: boolean | null;
    is_manset?: boolean | null;
    is_ust_manset?: boolean | null;
    published_at: string | null;
    created_at: string;
    category_id?: string | null;
    categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
    view_count?: unknown;
    is_published?: boolean | null;
    social_shared?: unknown;
  },
  options: { viewCount: number; isPublished: boolean },
): AdminArticleRow {
  const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    view_count: options.viewCount,
    is_breaking: Boolean(row.is_breaking),
    importance_score:
      typeof row.importance_score === "number" ? row.importance_score : null,
    is_headline: Boolean(row.is_headline ?? row.is_ust_manset),
    is_top_headline: Boolean(row.is_top_headline ?? row.is_manset),
    is_published: options.isPublished,
    published_at: row.published_at,
    created_at: row.created_at,
    category_id: row.category_id ?? "",
    category_name: cat?.name ?? "—",
    category_slug: cat?.slug ?? "",
    social_shared: parseSocialShared(row.social_shared),
  };
}

async function getAdminArticlesFallback(
  sort: AdminArticlesSort = "newest",
): Promise<AdminArticlesQueryResult> {
  const supabase = createSupabaseAdminClient();
  let lastError: string | null = null;

  for (const select of [ADMIN_SELECT_SAFE, ADMIN_SELECT_MINIMAL]) {
    const { data, error } = await orderAdminArticles(
      supabase.from("articles").select(select),
      sort,
    );
    if (!error && data) {
      const rows = data as unknown as Parameters<typeof mapAdminArticleRow>[0][];
      return {
        articles: applyAdminArticlesSort(
          rows.map((row) =>
            mapAdminArticleRow(row, {
              viewCount: coerceViewCount((row as { view_count?: unknown }).view_count),
              isPublished: (row as { is_published?: boolean | null }).is_published !== false,
            }),
          ),
          sort,
        ),
        error: null,
      };
    }
    if (error) {
      lastError = error.message ?? "Haberler yüklenemedi";
      console.warn("[getAdminArticlesFallback] deneme:", error.message);
    }
  }

  const legacy = await supabase
    .from("articles")
    .select(
      `
      id,
      title,
      slug,
      is_breaking,
      published_at,
      created_at,
      category_id,
      categories ( name, slug )
    `,
    )
    .order("created_at", { ascending: false });

  if (legacy.error) {
    console.error("[getAdminArticlesFallback] legacy:", legacy.error);
    return { articles: [], error: legacy.error.message ?? lastError ?? "Haberler yüklenemedi" };
  }

  if (!legacy.data) {
    return { articles: [], error: lastError ?? "Supabase boş yanıt döndü" };
  }

  const legacyRows = legacy.data as unknown as Parameters<typeof mapAdminArticleRow>[0][];
  return {
    articles: applyAdminArticlesSort(
      legacyRows.map((row) =>
        mapAdminArticleRow(row, {
          viewCount: 0,
          isPublished: isRowPublished(row),
        }),
      ),
      sort,
    ),
    error: null,
  };
}

export type AdminEntityRow = {
  id: string;
  name: string;
  slug: string;
  entity_type: "kisi" | "takim" | "kurum";
  entity_type_label: string;
  created_at: string;
};

const ENTITY_TYPE_LABELS: Record<AdminEntityRow["entity_type"], string> = {
  kisi: "Kişi",
  takim: "Takım",
  kurum: "Kurum",
};

export async function getAdminEntities(): Promise<AdminEntityRow[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("entities")
    .select("id, name, slug, entity_type, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[getAdminEntities]", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    entity_type: row.entity_type,
    entity_type_label: ENTITY_TYPE_LABELS[row.entity_type as AdminEntityRow["entity_type"]],
    created_at: row.created_at,
  }));
}

export async function getAdminCategories(): Promise<AdminCategoryOption[]> {
  const supabase = createSupabaseClient();
  const withParent = await supabase
    .from("categories")
    .select("id, slug, name, parent_id")
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("name");

  if (!withParent.error && withParent.data) {
    return withParent.data as AdminCategoryOption[];
  }

  if (isMissingDbColumn(withParent.error, "parent_id")) {
    const plain = await supabase.from("categories").select("id, slug, name").order("name");
    if (!plain.data) return [];
    return plain.data.map((row) => ({ ...row, parent_id: null }));
  }

  return [];
}
