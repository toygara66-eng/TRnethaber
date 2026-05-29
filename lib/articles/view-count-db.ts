/** Supabase articles.view_count sütunu henüz yoksa */
export function isMissingViewCountColumn(message?: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("view_count") ||
    m.includes("42703") ||
    (m.includes("column") && m.includes("does not exist"))
  );
}

export function coerceViewCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
  }
  return 0;
}

export function parseAdminViewCountInput(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").trim();
  if (text === "") return 0;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}
