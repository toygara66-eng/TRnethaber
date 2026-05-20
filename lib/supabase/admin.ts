import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { getSupabaseEnv } from "@/lib/supabase";

/** CMS yazma işlemleri — yalnızca sunucuda, service_role ile (RLS bypass). */
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const { url } = getSupabaseEnv();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY
  )?.trim();

  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY eksik. Supabase Dashboard → Settings → API bölümünden secret/service_role anahtarını .env.local dosyasına ekleyin, ardından npm run dev yeniden başlatın.",
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
