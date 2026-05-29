/** Supabase URL + anon key (sunucu ve istemci). */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL
  )
    ?.trim()
    .replace(/\/$/, "");

  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase ortam değişkenleri eksik. NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ekleyin.",
    );
  }

  return { url, anonKey };
}
