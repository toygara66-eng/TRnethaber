import { isMissingDbColumn } from "@/lib/queries/categories-shared";
import { createSupabaseClient } from "@/lib/supabase";

export type AdminArticleRow = {
  id: string;
  title: string;
  slug: string;
  okuma_sayisi: string;
  is_breaking: boolean;
  published_at: string | null;
  created_at: string;
  category_name: string;
  category_slug: string;
};

export type AdminCategoryOption = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
};

export async function getAdminArticles(): Promise<AdminArticleRow[]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      `
      id,
      title,
      slug,
      okuma_sayisi,
      is_breaking,
      published_at,
      created_at,
      categories ( name, slug )
    `,
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[getAdminArticles]", error);
    return [];
  }

  return data.map((row) => {
    const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      okuma_sayisi: row.okuma_sayisi,
      is_breaking: row.is_breaking,
      published_at: row.published_at,
      created_at: row.created_at,
      category_name: cat?.name ?? "—",
      category_slug: cat?.slug ?? "",
    };
  });
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
