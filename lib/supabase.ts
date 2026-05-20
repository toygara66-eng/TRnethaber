import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";

export type { Database };

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Sunucu sorguları SUPABASE_* kullanır (runtime, derlemede gömülmez).
 * İstemci için NEXT_PUBLIC_* yedek olarak okunur.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )
    ?.trim()
    .replace(/\/$/, "");

  const anonKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase ortam değişkenleri eksik. .env.local dosyasına SUPABASE_URL ve SUPABASE_PUBLISHABLE_KEY ekleyin.",
    );
  }

  if (!url.includes(".supabase.co")) {
    throw new Error(
      "SUPABASE_URL geçersiz. Dashboard → Settings → API → Project URL değerini aynen kopyalayın.",
    );
  }

  return { url, anonKey };
}

/** Tarayıcı için (gerekirse). */
export function getSupabase(): SupabaseClient<Database> {
  if (!browserClient) {
    const { url, anonKey } = getSupabaseEnv();
    browserClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: typeof window !== "undefined",
        autoRefreshToken: true,
      },
    });
  }
  return browserClient;
}

/** Sunucu bileşenleri ve sorgular — her çağrıda güncel env. */
export function createSupabaseClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseEnv();
  return createClient<Database>(url, anonKey);
}
