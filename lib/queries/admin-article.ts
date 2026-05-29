import { coerceViewCount, isMissingViewCountColumn } from "@/lib/articles/view-count-db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminArticleEdit = {
  id: string;
  title: string;
  slug: string;
  spot_metni: string;
  content: string;
  kapak_gorseli: string;
  category_id: string;
  view_count: number;
  is_published: boolean;
  published_at: string | null;
  category_name: string;
  category_slug: string;
};

export async function getAdminArticleById(id: string): Promise<AdminArticleEdit | null> {
  try {
    const supabase = createSupabaseAdminClient();

    const full = await supabase
      .from("articles")
      .select(
        `
        id,
        title,
        slug,
        spot_metni,
        content,
        kapak_gorseli,
        category_id,
        view_count,
        is_published,
        published_at,
        categories ( name, slug )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (full.error || !full.data) {
      const plain = await supabase
        .from("articles")
        .select(
          "id, title, slug, spot_metni, content, kapak_gorseli, category_id, published_at, categories ( name, slug )",
        )
        .eq("id", id)
        .maybeSingle();

      if (plain.error || !plain.data) return null;
      const row = plain.data as {
        id: string;
        title: string;
        slug: string;
        spot_metni: string | null;
        content: string;
        kapak_gorseli: string | null;
        category_id: string;
        published_at: string | null;
        categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
      };
      const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        spot_metni: row.spot_metni ?? "",
        content: row.content ?? "",
        kapak_gorseli: row.kapak_gorseli ?? "",
        category_id: row.category_id,
        view_count: 0,
        is_published: Boolean(row.published_at),
        published_at: row.published_at,
        category_name: cat?.name ?? "—",
        category_slug: cat?.slug ?? "",
      };
    }

    const row = full.data as {
      id: string;
      title: string;
      slug: string;
      spot_metni: string | null;
      content: string;
      kapak_gorseli: string | null;
      category_id: string;
      view_count?: unknown;
      is_published: boolean | null;
      published_at: string | null;
      categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
    };
    const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      spot_metni: row.spot_metni ?? "",
      content: row.content ?? "",
      kapak_gorseli: row.kapak_gorseli ?? "",
      category_id: row.category_id,
      view_count: coerceViewCount(row.view_count),
      is_published: row.is_published !== false,
      published_at: row.published_at,
      category_name: cat?.name ?? "—",
      category_slug: cat?.slug ?? "",
    };
  } catch (err) {
    console.error("[getAdminArticleById]", err);
    return null;
  }
}
