import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RedirectManager } from "@/components/admin/RedirectManager";
import { REDIRECTS_SETUP_SQL_PATH } from "@/lib/redirects/schema-status";
import {
  getBrokenLinksAdmin,
  getRedirectsAdmin,
  getRedirectsSchemaStatus,
} from "@/lib/queries/redirects";

export const dynamic = "force-dynamic";

export default async function AdminRedirectsPage() {
  const [schemaStatus, brokenLinks, redirects] = await Promise.all([
    getRedirectsSchemaStatus(),
    getBrokenLinksAdmin(),
    getRedirectsAdmin(),
  ]);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="404 & Link Yönetimi"
        description="Kırık link günlüğü ve kalıcı 301 yönlendirme merkezi — SEO kurtarma simidi."
      />

      {!schemaStatus.ready ? (
        <div
          className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-950 sm:px-5"
          role="alert"
        >
          <p className="font-semibold">Veritabanı kurulumu gerekli</p>
          <p className="mt-2 leading-relaxed">{schemaStatus.message}</p>
          <p className="mt-3 text-xs text-amber-900/80">
            Dosya yolu: <code className="font-mono">{REDIRECTS_SETUP_SQL_PATH}</code>
          </p>
        </div>
      ) : null}

      <RedirectManager brokenLinks={brokenLinks} redirects={redirects} />
    </div>
  );
}
