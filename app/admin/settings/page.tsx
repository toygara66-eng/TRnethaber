import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { SocialSettingsForm } from "@/components/admin/SocialSettingsForm";
import { saveSiteSettings } from "@/lib/actions/site-settings";
import { saveSocialSettings } from "@/lib/actions/social-settings";
import {
  getSiteSettingsAdmin,
  isMissingSiteSettingsTable,
  SITE_SETTINGS_MIGRATION_HINT,
} from "@/lib/queries/site-settings";
import { getSocialSettingsAdmin } from "@/lib/queries/social-settings";
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
  const [settings, socialSettings, tableReady] = await Promise.all([
    getSiteSettingsAdmin(),
    getSocialSettingsAdmin(),
    siteSettingsTableExists(),
  ]);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Kurumsal Kimlik & Sosyal Medya"
        description="Logo, yayıncı kimliği ve ana sayfa sosyal medya bağlantıları."
      />

      {!tableReady ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <p className="font-semibold">Veritabanı: site_settings tablosu eksik</p>
          <p className="mt-2 leading-relaxed">
            Ayarları kaydetmek için Supabase SQL Editor&apos;da şu migration&apos;ı çalıştırın:{" "}
            <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">
              supabase/migrations/20260529_site_settings.sql
            </code>
          </p>
          <p className="mt-2 text-xs text-amber-900/80">{SITE_SETTINGS_MIGRATION_HINT}</p>
        </div>
      ) : null}

      <div className="space-y-10">
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-trnet-text">
            Logo ayarları
          </h2>
          <SiteSettingsForm settings={settings} saveAction={saveSiteSettings} />
        </section>

        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-trnet-text">
            Sosyal medya hesapları
          </h2>
          <SocialSettingsForm settings={socialSettings} saveAction={saveSocialSettings} />
        </section>
      </div>
    </div>
  );
}
