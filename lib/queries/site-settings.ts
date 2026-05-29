import { resolveSiteLogoUrl } from "@/lib/images/cover";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseClient } from "@/lib/supabase";

export type SiteSettings = {
  logoSquareUrl: string;
  logoRectangleUrl: string;
};

const DEFAULTS: SiteSettings = {
  logoSquareUrl: resolveSiteLogoUrl(null, "/logo-square.png"),
  logoRectangleUrl: resolveSiteLogoUrl(null, "/logo.svg"),
};

const KEYS = {
  logoSquareUrl: "logo_square_url",
  logoRectangleUrl: "logo_rectangle_url",
} as const;

export function isMissingSiteSettingsTable(message?: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("site_settings") &&
    (m.includes("schema cache") ||
      m.includes("could not find") ||
      m.includes("pgrst205") ||
      m.includes("does not exist") ||
      m.includes("relation"))
  );
}

export const SITE_SETTINGS_MIGRATION_HINT =
  "Supabase Dashboard → SQL Editor → supabase/migrations/20260529_site_settings.sql dosyasını çalıştırın.";

function mapRows(rows: { key: string; value: string }[] | null): SiteSettings {
  const map = new Map((rows ?? []).map((r) => [r.key, r.value?.trim() ?? ""]));
  return {
    logoSquareUrl: resolveSiteLogoUrl(
      map.get(KEYS.logoSquareUrl),
      "/logo-square.png",
    ),
    logoRectangleUrl: resolveSiteLogoUrl(
      map.get(KEYS.logoRectangleUrl),
      "/logo.svg",
    ),
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from("site_settings").select("key, value");

    if (error) {
      if (isMissingSiteSettingsTable(error.message)) return DEFAULTS;
      console.warn("[getSiteSettings]", error.message);
      return DEFAULTS;
    }

    return mapRows(data as { key: string; value: string }[]);
  } catch {
    return DEFAULTS;
  }
}

export async function getSiteSettingsAdmin(): Promise<SiteSettings> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("site_settings").select("key, value");

    if (error) {
      if (isMissingSiteSettingsTable(error.message)) {
        console.warn("[getSiteSettingsAdmin] site_settings tablosu yok — varsayılan logo kullanılıyor.");
        return DEFAULTS;
      }
      console.warn("[getSiteSettingsAdmin]", error.message);
      return DEFAULTS;
    }
    if (!data) return DEFAULTS;
    return mapRows(data as { key: string; value: string }[]);
  } catch {
    return DEFAULTS;
  }
}

export async function upsertSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const rows = [
    { key: KEYS.logoSquareUrl, value: settings.logoSquareUrl ?? "" },
    { key: KEYS.logoRectangleUrl, value: settings.logoRectangleUrl ?? "" },
  ];

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) {
    if (isMissingSiteSettingsTable(error.message)) {
      throw new Error(`site_settings tablosu bulunamadı. ${SITE_SETTINGS_MIGRATION_HINT}`);
    }
    throw new Error(error.message);
  }
}
