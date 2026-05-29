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
  is_breaking: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
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

export async function getAdminArticles(): Promise<AdminArticleRow[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("articles")
      .select(
        `
        id,
        title,
        slug,
        view_count,
        is_breaking,
        is_published,
        published_at,
        created_at,
        social_shared,
        categories ( name, slug )
      `,
      )
      .order("created_at", { ascending: false });

    if (
      error?.message?.includes("is_published") ||
      isMissingViewCountColumn(error?.message) ||
      isMissingSocialSharedColumn(error?.message)
    ) {
      return getAdminArticlesFallback();
    }

    if (error || !data) {
      console.error("[getAdminArticles]", error);
      return [];
    }

    return data.map((row) =>
      mapAdminArticleRow(row, {
        viewCount: coerceViewCount((row as { view_count?: unknown }).view_count),
        isPublished: row.is_published !== false,
      }),
    );
  } catch (err) {
    console.error("[getAdminArticles]", err);
    return getAdminArticlesFallback();
  }
}

function mapAdminArticleRow(
  row: {
    id: string;
    title: string;
    slug: string;
    is_breaking: boolean | null;
    published_at: string | null;
    created_at: string;
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
    is_published: options.isPublished,
    published_at: row.published_at,
    created_at: row.created_at,
    category_name: cat?.name ?? "—",
    category_slug: cat?.slug ?? "",
    social_shared: parseSocialShared(row.social_shared),
  };
}

async function getAdminArticlesFallback(): Promise<AdminArticleRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      `
      id,
      title,
      slug,
      view_count,
      is_breaking,
      is_published,
      published_at,
      created_at,
      social_shared,
      categories ( name, slug )
    `,
    )
    .order("created_at", { ascending: false });

  if (error?.message && isMissingSocialSharedColumn(error.message)) {
    const withoutSocial = await supabase
      .from("articles")
      .select(
        `
        id,
        title,
        slug,
        view_count,
        is_breaking,
        is_published,
        published_at,
        created_at,
        categories ( name, slug )
      `,
      )
      .order("created_at", { ascending: false });
    if (!withoutSocial.data) return [];
    return withoutSocial.data.map((row) =>
      mapAdminArticleRow(row, {
        viewCount: coerceViewCount((row as { view_count?: unknown }).view_count),
        isPublished: row.is_published !== false,
      }),
    );
  }

  if (error?.message && isMissingViewCountColumn(error.message)) {
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
        categories ( name, slug )
      `,
      )
      .order("created_at", { ascending: false });
    if (!legacy.data) return [];
    return legacy.data.map((row) =>
      mapAdminArticleRow(row, {
        viewCount: 0,
        isPublished: isRowPublished(row),
      }),
    );
  }

  if (error || !data) return [];

  return data.map((row) =>
    mapAdminArticleRow(row, {
      viewCount: coerceViewCount((row as { view_count?: unknown }).view_count),
      isPublished: row.is_published !== false,
    }),
  );
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
