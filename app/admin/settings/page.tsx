import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { saveSiteSettings } from "@/lib/actions/site-settings";
import {
  getSiteSettingsAdmin,
  isMissingSiteSettingsTable,
  SITE_SETTINGS_MIGRATION_HINT,
} from "@/lib/queries/site-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function siteSettingsTableExists(): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("site_settings").select("key").limit(1);
    return !error || !isMissingSiteSettingsTable(error.message);
  } catch {
    return false;
  }
}

export default async function AdminSettingsPage() {
  const [settings, tableReady] = await Promise.all([
    getSiteSettingsAdmin(),
    siteSettingsTableExists(),
  ]);

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-trnet-text">
          Kurumsal Kimlik & Logo
        </h1>
        <p className="mt-1 text-sm text-trnet-text/60">
          Schema.org ve haber detay yayıncı logosu ayarları.
        </p>
      </div>

      {!tableReady ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-semibold">Veritabanı: site_settings tablosu eksik</p>
          <p className="mt-2 leading-relaxed">
            Logo kaydetmek için Supabase SQL Editor&apos;da şu migration&apos;ı çalıştırın:{" "}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">
              supabase/migrations/20260529_site_settings.sql
            </code>
          </p>
          <p className="mt-2 text-xs text-amber-900/80">{SITE_SETTINGS_MIGRATION_HINT}</p>
        </div>
      ) : null}

      <SiteSettingsForm settings={settings} saveAction={saveSiteSettings} />
    </div>
  );
}
