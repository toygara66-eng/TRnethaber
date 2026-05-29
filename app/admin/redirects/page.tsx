import { RedirectManager } from "@/components/admin/RedirectManager";
import { getBrokenLinksAdmin, getRedirectsAdmin } from "@/lib/queries/redirects";

export const dynamic = "force-dynamic";

export default async function AdminRedirectsPage() {
  const [brokenLinks, redirects] = await Promise.all([
    getBrokenLinksAdmin(),
    getRedirectsAdmin(),
  ]);

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-trnet-text">
          404 & Link Yönetimi
        </h1>
        <p className="mt-1 text-sm text-trnet-text/60">
          Kırık link günlüğü ve kalıcı 301 yönlendirme merkezi — SEO kurtarma simidi.
        </p>
      </div>

      <RedirectManager brokenLinks={brokenLinks} redirects={redirects} />
    </div>
  );
}
