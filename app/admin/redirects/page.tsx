import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RedirectManager } from "@/components/admin/RedirectManager";
import { getBrokenLinksAdmin, getRedirectsAdmin } from "@/lib/queries/redirects";

export const dynamic = "force-dynamic";

export default async function AdminRedirectsPage() {
  const [brokenLinks, redirects] = await Promise.all([
    getBrokenLinksAdmin(),
    getRedirectsAdmin(),
  ]);

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="404 & Link Yönetimi"
        description="Kırık link günlüğü ve kalıcı 301 yönlendirme merkezi — SEO kurtarma simidi."
      />

      <RedirectManager brokenLinks={brokenLinks} redirects={redirects} />
    </div>
  );
}
