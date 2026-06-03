import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  areSpecialCategoryDuplicates,
  getSpecialDuplicateGroup,
  specialCategoryDisplayLabel,
} from "@/lib/articles/duplicate-special-match";
import { titleSimilarityRatio } from "@/lib/articles/title-similarity";

export const DUPLICATE_SIMILARITY_THRESHOLD = 0.8;
export const DUPLICATE_SCAN_LIMIT = 200;

export type ArticleTitleRow = {
  id: string;
  title: string;
  created_at: string;
  categorySlug: string;
};

export type DuplicateMatchKind = "general_similarity" | "special_entity";

export type DuplicateRemoval = {
  deletedId: string;
  deletedTitle: string;
  keptId: string;
  keptTitle: string;
  similarity: number;
  matchKind: DuplicateMatchKind;
  categorySlug: string;
  sharedToken?: string;
};

function resolveCategorySlug(row: {
  categories?: { slug: string } | { slug: string }[] | null;
}): string {
  const c = row.categories;
  if (!c) return "";
  if (Array.isArray(c)) return c[0]?.slug ?? "";
  return c.slug ?? "";
}

export async function fetchRecentArticlesForDuplicateScan(
  limit = DUPLICATE_SCAN_LIMIT,
): Promise<{ rows: ArticleTitleRow[]; error: string | null }> {
  const supabase = createSupabaseAdminClient();

  const withCategory = await supabase
    .from("articles")
    .select("id, title, created_at, category_id, categories ( slug )")
    .order("created_at", { ascending: false })
    .limit(limit);

  const source = withCategory.error
    ? await supabase
        .from("articles")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(limit)
    : withCategory;

  if (source.error) {
    return { rows: [], error: source.error.message };
  }

  const rows = (source.data ?? [])
    .filter(
      (row): row is typeof row & { id: string; title: string; created_at: string } =>
        Boolean(row.id && row.title && row.created_at),
    )
    .map((row) => ({
      id: row.id,
      title: String(row.title).trim(),
      created_at: row.created_at,
      categorySlug: resolveCategorySlug(
        row as { categories?: { slug: string } | { slug: string }[] | null },
      ),
    }));

  return { rows, error: null };
}

function shouldCompareAsDuplicates(
  newer: ArticleTitleRow,
  older: ArticleTitleRow,
  threshold: number,
): Omit<DuplicateRemoval, "deletedId" | "deletedTitle" | "keptId" | "keptTitle"> | null {
  const groupNew = getSpecialDuplicateGroup(newer.categorySlug);
  const groupOld = getSpecialDuplicateGroup(older.categorySlug);

  if (groupNew && groupOld) {
    if (groupNew !== groupOld) {
      return null;
    }
    const special = areSpecialCategoryDuplicates(newer.title, older.title, groupNew);
    if (!special.duplicate) {
      return null;
    }
    return {
      similarity: 1,
      matchKind: "special_entity",
      categorySlug: newer.categorySlug || older.categorySlug,
      sharedToken: special.sharedToken ?? undefined,
    };
  }

  if (groupNew || groupOld) {
    return null;
  }

  const similarity = titleSimilarityRatio(newer.title, older.title);
  if (similarity < threshold) {
    return null;
  }

  return {
    similarity,
    matchKind: "general_similarity",
    categorySlug: newer.categorySlug || older.categorySlug || "gundem",
  };
}

/** Yeni → eski sıralı listede mükerrer çiftlerde yeni olanı işaretle. */
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

      const match = shouldCompareAsDuplicates(newer, older, threshold);
      if (!match) continue;

      pendingDelete.add(newer.id);
      removals.push({
        deletedId: newer.id,
        deletedTitle: newer.title,
        keptId: older.id,
        keptTitle: older.title,
        ...match,
      });
      break;
    }
  }

  return removals;
}

function logDuplicateRemoval(removal: DuplicateRemoval): void {
  if (removal.matchKind === "special_entity") {
    const label = specialCategoryDisplayLabel(
      getSpecialDuplicateGroup(removal.categorySlug) ?? "kimdir",
    );
    const anchor = removal.sharedToken
      ? removal.sharedToken
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "içerik";
    console.log(
      `${label} kategorisinde mükerrer [${anchor}] içeriği tespit edildi ve 1'inci sınıf temizlik algoritmasıyla silindi: ${removal.deletedTitle} (korunan: ${removal.keptTitle})`,
    );
    return;
  }

  const pct = Math.round(removal.similarity * 100);
  console.log(
    `Genel kategoride mükerrer başlık tespit edildi (benzerlik yüzde ${pct}, eşik yüzde 80) ve silindi: ${removal.deletedTitle} (korunan: ${removal.keptTitle})`,
  );
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
    logDuplicateRemoval(removal);
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
