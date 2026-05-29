import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type { Database };
export { getSupabaseEnv };

let browserClient: SupabaseClient<Database> | null = null;

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
