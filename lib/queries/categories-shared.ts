import type { CategoryRow } from "@/lib/supabase/rows";

export function isMissingDbColumn(
  error: { message?: string; code?: string } | null,
  column: string,
): boolean {
  if (!error) return false;
  const msg = error.message ?? "";
  return (
    error.code === "42703" ||
    msg.includes("does not exist") ||
    msg.includes(column)
  );
}

/** Üst kategoriler; parent_id yoksa yerel-* alt illeri filtreler. */
export function filterTopLevelCategories(rows: CategoryRow[]): CategoryRow[] {
  if (rows.some((r) => r.parent_id != null)) {
    return rows.filter((r) => !r.parent_id);
  }
  return rows.filter((r) => !r.slug.startsWith("yerel-") || r.slug === "yerel-haberler");
}
