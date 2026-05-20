/**
 * Ortam değişkeni kontrolleri — derleme sırasında throw etmez.
 * Eksik değerlerde boş/false döner; runtime (cron, admin) net hata üretir.
 */

export function getCronSecret(): string | undefined {
  return (
    process.env.CRON_SECRET_KEY?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    undefined
  );
}

export function hasSupabasePublicEnv(): boolean {
  const url = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim();
  const key = (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  return Boolean(url && key && url.includes(".supabase.co"));
}

export function hasSupabaseAdminEnv(): boolean {
  return Boolean(
    hasSupabasePublicEnv() &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        process.env.SUPABASE_SECRET_KEY?.trim()),
  );
}

export function hasGeminiEnv(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/** Cron / news-bot için zorunlu production değişkenleri */
export function getNewsBotEnvMissing(): string[] {
  const missing: string[] = [];
  if (!getCronSecret()) {
    missing.push("CRON_SECRET_KEY veya CRON_SECRET");
  }
  if (!hasSupabasePublicEnv()) {
    missing.push("SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY");
  }
  if (!hasSupabaseAdminEnv()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!hasGeminiEnv()) {
    missing.push("GEMINI_API_KEY");
  }
  return missing;
}

/** Vercel build öncesi önerilen (vitrin için) public env */
export function getVitrinEnvMissing(): string[] {
  const missing: string[] = [];
  if (!hasSupabasePublicEnv()) {
    missing.push("SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY");
  }
  return missing;
}
