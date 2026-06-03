import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { titleSimilarityRatio } from "@/lib/articles/title-similarity";

export const DUPLICATE_SIMILARITY_THRESHOLD = 0.8;
export const DUPLICATE_SCAN_LIMIT = 200;

export type ArticleTitleRow = {
  id: string;
  title: string;
  created_at: string;
};

export type DuplicateRemoval = {
  deletedId: string;
  deletedTitle: string;
  keptId: string;
  keptTitle: string;
  similarity: number;
};

export async function fetchRecentArticlesForDuplicateScan(
  limit = DUPLICATE_SCAN_LIMIT,
): Promise<{ rows: ArticleTitleRow[]; error: string | null }> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { rows: [], error: error.message };
  }

  const rows = (data ?? [])
    .filter(
      (row): row is ArticleTitleRow =>
        Boolean(row.id && row.title && row.created_at),
    )
    .map((row) => ({
      id: row.id,
      title: String(row.title).trim(),
      created_at: row.created_at,
    }));

  return { rows, error: null };
}

/** Yeni → eski sıralı listede, eşik üstü benzer çiftlerde yeni olanı işaretle. */
export function findDuplicateArticlesToRemove(
  articlesNewestFirst: ArticleTitleRow[],
  threshold = DUPLICATE_SIMILARITY_THRESHOLD,
): DuplicateRemoval[] {
  const removals: DuplicateRemoval[] = [];
  const pendingDelete = new Set<string>();

  for (let i = 0; i < articlesNewestFirst.length; i++) {
    const newer = articlesNewestFirst[i];
    if (pendingDelete.has(newer.id)) continue;

    for (let j = i + 1; j < articlesNewestFirst.length; j++) {
      const older = articlesNewestFirst[j];
      if (pendingDelete.has(older.id)) continue;

      const similarity = titleSimilarityRatio(newer.title, older.title);
      if (similarity < threshold) continue;

      pendingDelete.add(newer.id);
      removals.push({
        deletedId: newer.id,
        deletedTitle: newer.title,
        keptId: older.id,
        keptTitle: older.title,
        similarity,
      });
      break;
    }
  }

  return removals;
}

export async function deleteDuplicateArticles(
  removals: DuplicateRemoval[],
): Promise<{ deletedCount: number; errors: string[] }> {
  if (removals.length === 0) {
    return { deletedCount: 0, errors: [] };
  }

  const supabase = createSupabaseAdminClient();
  const ids = Array.from(new Set(removals.map((r) => r.deletedId)));
  const { error } = await supabase.from("articles").delete().in("id", ids);

  if (error) {
    return { deletedCount: 0, errors: [error.message] };
  }

  for (const removal of removals) {
    const pct = Math.round(removal.similarity * 100);
    console.log(
      `Kopya haber silindi: ${removal.deletedTitle} (benzerlik: %${pct}, korunan: ${removal.keptTitle})`,
    );
  }

  return { deletedCount: ids.length, errors: [] };
}

export async function runDuplicateCleaner(
  limit = DUPLICATE_SCAN_LIMIT,
): Promise<{
  scanned: number;
  removed: DuplicateRemoval[];
  deletedCount: number;
  error: string | null;
}> {
  const { rows, error: fetchError } = await fetchRecentArticlesForDuplicateScan(limit);
  if (fetchError) {
    return { scanned: 0, removed: [], deletedCount: 0, error: fetchError };
  }

  const removals = findDuplicateArticlesToRemove(rows);
  const { deletedCount, errors } = await deleteDuplicateArticles(removals);

  if (errors.length > 0) {
    return {
      scanned: rows.length,
      removed: removals,
      deletedCount,
      error: errors.join("; "),
    };
  }

  return {
    scanned: rows.length,
    removed: removals,
    deletedCount,
    error: null,
  };
}
