export const REDIRECTS_SETUP_SQL_PATH =
  "supabase/migrations/20260522_redirects_broken_links.sql";

export const REDIRECTS_SCHEMA_MISSING_MESSAGE =
  "redirects tablosu Supabase veritabanında yok. Supabase Dashboard → SQL Editor bölümünde " +
  `${REDIRECTS_SETUP_SQL_PATH} dosyasının içeriğini çalıştırın, ardından sayfayı yenileyin.`;

/** PostgREST / Supabase — tablo henüz oluşturulmamış veya şema önbelleği güncel değil */
export function isRedirectsSchemaMissingError(message: string | undefined | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("could not find the table") ||
    lower.includes("schema cache") ||
    lower.includes("pgrst205") ||
    (lower.includes("redirects") && lower.includes("does not exist")) ||
    (lower.includes("broken_links") && lower.includes("does not exist"))
  );
}

export function friendlyRedirectsDbError(message: string | undefined | null): string {
  if (isRedirectsSchemaMissingError(message)) {
    return REDIRECTS_SCHEMA_MISSING_MESSAGE;
  }
  return message?.trim() || "Veritabanı işlemi başarısız.";
}
