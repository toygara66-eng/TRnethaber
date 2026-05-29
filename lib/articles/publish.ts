import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";

type PublishableRow = {
  is_published?: boolean | null;
  published_at?: string | null;
};

/** published_at geçmişte veya şu an mı (drip-feed gelecek tarihleri gizler) */
export function isPublishedAtVisible(iso: string | null | undefined): boolean {
  if (!iso?.trim()) return false;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return false;
  return ts <= Date.now();
}

/** Satır yayında mı — is_published öncelikli, yoksa published_at <= NOW */
export function isRowPublished(row: PublishableRow): boolean {
  if (row.is_published === false) return false;
  if (row.is_published === true) return true;
  return isPublishedAtVisible(row.published_at);
}

type QueryLike = {
  eq: (column: string, value: boolean) => QueryLike;
  not: (column: string, operator: string, value: null) => QueryLike;
  lte: (column: string, value: string) => QueryLike;
};

/** Ön yüz: published_at dolu ve published_at <= şimdi */
export function publishVisibilityCutoffIso(): string {
  return new Date().toISOString();
}

/**
 * Ön yüz sorguları — is_published sütunu olmasa da çalışır.
 * Yayın = published_at dolu ve zamanı gelmiş (drip-feed uyumlu).
 */
export function filterPublishedRows<Q extends QueryLike>(query: Q): Q {
  return query
    .not("published_at", "is", null)
    .lte("published_at", publishVisibilityCutoffIso()) as Q;
}

/** SELECT ifadesinden eksik sütunları temizler */
export function stripSelectColumns(select: string, ...columns: string[]): string {
  let result = select;
  for (const col of columns) {
    result = result
      .replace(new RegExp(`\\s*,\\s*${col}\\s*,`, "g"), ",")
      .replace(new RegExp(`^\\s*${col}\\s*,\\s*`, "m"), "")
      .replace(new RegExp(`\\s*,\\s*${col}\\s*$`, "m"), "")
      .replace(new RegExp(`\\n\\s*${col}\\s*,?\\n`, "g"), "\n");
  }
  return result.replace(/,\s*,/g, ",").replace(/,\s*\n\s*\)/g, "\n  )");
}

/** @deprecated Ön yüzde filterPublishedRows kullanın */
export function applyPublishedFilter<Q extends QueryLike>(query: Q): Q {
  return filterPublishedRows(query);
}

export function isMissingIsPublishedColumn(message?: string): boolean {
  if (!message) return false;
  return (
    message.includes("is_published") ||
    message.includes("42703") ||
    message.includes("does not exist")
  );
}
