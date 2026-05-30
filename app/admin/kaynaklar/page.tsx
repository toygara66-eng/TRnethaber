import { RssSourcesManager } from "@/components/admin/RssSourcesManager";
import { getAdminCategories } from "@/lib/queries/admin";
import { getAdminRssSources } from "@/lib/queries/rss-sources";
import { TURKIYE_ILLER } from "@/lib/data/turkiye-iller";

export const dynamic = "force-dynamic";

export default async function AdminKaynaklarPage() {
  const [sources, categories] = await Promise.all([
    getAdminRssSources(),
    getAdminCategories(),
  ]);

  const cityOptions = TURKIYE_ILLER.map((il) => il.name).sort((a, b) =>
    a.localeCompare(b, "tr"),
  );

  return (
    <>
      <header className="border-b border-black/[0.06] bg-trnet-card px-4 py-4 shadow-sm sm:px-6 sm:py-5 lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-trnet-text sm:text-3xl">
          Haber Kaynakları
        </h1>
        <p className="mt-1 text-sm text-trnet-text/55">
          81 il RSS istihbarat ağı — aktif kaynaklar otonom haber botuna beslenir.
        </p>
      </header>

      <div className="admin-page !pt-4 sm:!pt-6">
        <RssSourcesManager
          sources={sources}
          categories={categories}
          cityOptions={cityOptions}
        />
      </div>
    </>
  );
}
