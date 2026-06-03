import { filterPublishedRows, isRowPublished } from "@/lib/articles/publish";
import { isMissingViewCountColumn } from "@/lib/articles/view-count-db";
import { createSupabaseClient } from "@/lib/supabase";

export type HomeFeedArticleRow = {
  id: string;
  title: string;
  slug: string;
  spot_metni: string | null;
  kapak_gorseli: string | null;
  view_count?: number | null;
  is_breaking: boolean | null;
  published_at: string | null;
  created_at?: string | null;
  category_id: string | null;
  categories?:
    | { slug: string; name: string }
    | { slug: string; name: string }[]
    | null;
};

async function fetchWithoutViewCount(
  from: number,
  to: number,
): Promise<{ rows: HomeFeedArticleRow[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const selectNoView = `
        id,
        title,
        slug,
        spot_metni,
        kapak_gorseli,
        is_breaking,
        published_at,
        category_id,
        categories ( slug, name )
      `;

  const res = await filterPublishedRows(
    supabase.from("articles").select(selectNoView),
  )
    .order("published_at", { ascending: false })
    .range(from, to);

  if (!res.error && res.data) {
    const rows = (res.data as unknown as HomeFeedArticleRow[]).filter((r) =>
      isRowPublished(r),
    );
    return { rows, error: null };
  }

  return { rows: [], error: res.error?.message ?? "Haberler yüklenemedi" };
}

export async function fetchHomeFeedPage(
  from: number,
  to: number,
): Promise<{ rows: HomeFeedArticleRow[]; error: string | null }> {
  try {
    const supabase = createSupabaseClient();

    const selectWithJoin = `
        id,
        title,
        slug,
        spot_metni,
        kapak_gorseli,
        view_count,
        is_breaking,
        published_at,
        category_id,
        categories ( slug, name )
      `;

    const withJoin = await filterPublishedRows(
      supabase.from("articles").select(selectWithJoin),
    )
      .order("published_at", { ascending: false })
      .range(from, to);

    if (!withJoin.error && withJoin.data) {
      const rows = (withJoin.data as unknown as HomeFeedArticleRow[]).filter((r) =>
        isRowPublished(r),
      );
      return { rows, error: null };
    }

    if (withJoin.error?.message && isMissingViewCountColumn(withJoin.error.message)) {
      return fetchWithoutViewCount(from, to);
    }

    const plain = await filterPublishedRows(
      supabase.from("articles").select(
        `
        id,
        title,
        slug,
        spot_metni,
        kapak_gorseli,
        view_count,
        is_breaking,
        published_at,
        created_at,
        category_id
      `,
      ),
    )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!plain.error && plain.data) {
      const rows = (plain.data as unknown as HomeFeedArticleRow[]).filter((r) =>
        isRowPublished(r),
      );
      return { rows, error: null };
    }

    if (plain.error?.message && isMissingViewCountColumn(plain.error.message)) {
      return fetchWithoutViewCount(from, to);
    }

    return {
      rows: [],
      error: plain.error?.message ?? withJoin.error?.message ?? "Haberler yüklenemedi",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bağlantı hatası";
    return { rows: [], error: message };
  }
}
