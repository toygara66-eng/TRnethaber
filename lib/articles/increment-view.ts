import { isMissingIsPublishedColumn, isRowPublished } from "@/lib/articles/publish";
import {
  coerceViewCount,
  isMissingViewCountColumn,
} from "@/lib/articles/view-count-db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type IncrementViewInput = {
  articleId?: string;
  slug?: string;
};

export type IncrementViewResult =
  | { ok: true; view_count: number; skipped?: boolean }
  | { ok: false; error: string; status: number };

export async function incrementArticleView(
  input: IncrementViewInput,
): Promise<IncrementViewResult> {
  const articleId = input.articleId?.trim();
  const slug = input.slug?.trim();

  if (!articleId && !slug) {
    return { ok: false, error: "articleId veya slug gerekli.", status: 400 };
  }

  try {
    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from("articles")
      .select("id, slug, view_count, published_at, is_published");

    if (articleId) {
      query = query.eq("id", articleId);
    } else if (slug) {
      query = query.eq("slug", slug);
    }

    let rowRes = await query.maybeSingle();

    if (rowRes.error?.message && isMissingViewCountColumn(rowRes.error.message)) {
      let fallbackQuery = supabase.from("articles").select("id, slug, published_at, is_published");
      if (articleId) fallbackQuery = fallbackQuery.eq("id", articleId);
      else if (slug) fallbackQuery = fallbackQuery.eq("slug", slug);
      rowRes = await fallbackQuery.maybeSingle();
    }

    if (rowRes.error?.message && isMissingIsPublishedColumn(rowRes.error.message)) {
      let fallbackQuery = supabase.from("articles").select("id, slug, published_at");
      if (articleId) fallbackQuery = fallbackQuery.eq("id", articleId);
      else if (slug) fallbackQuery = fallbackQuery.eq("slug", slug);
      rowRes = await fallbackQuery.maybeSingle();
    }

    if (rowRes.error) {
      return { ok: false, error: rowRes.error.message, status: 500 };
    }

    if (!rowRes.data || !isRowPublished(rowRes.data)) {
      return { ok: false, error: "Haber bulunamadı.", status: 404 };
    }

    const current = coerceViewCount(
      (rowRes.data as { view_count?: unknown }).view_count,
    );
    const nextCount = current + 1;
    const resolvedId = rowRes.data.id;

    const { error: updateError } = await supabase
      .from("articles")
      .update({
        view_count: nextCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolvedId);

    if (updateError) {
      if (isMissingViewCountColumn(updateError.message)) {
        return { ok: true, view_count: current, skipped: true };
      }
      return { ok: false, error: updateError.message, status: 500 };
    }

    return { ok: true, view_count: nextCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sayaç güncellenemedi.";
    return { ok: false, error: message, status: 500 };
  }
}
