import { EntityForm } from "@/components/admin/EntityForm";
import { EntitiesTable } from "@/components/admin/EntitiesTable";
import { getAdminEntities } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminVarliklarPage() {
  const entities = await getAdminEntities();

  return (
    <>
      <header className="border-b border-black/[0.06] bg-trnet-card px-4 py-4 shadow-sm sm:px-6 sm:py-5 lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-trnet-text sm:text-3xl">
          Semantik Varlıklar
        </h1>
        <p className="mt-1 text-sm text-trnet-text/55">
          Kimdir ağı — entities tablosu · {entities.length} kayıt
        </p>
      </header>

      <div className="admin-page space-y-6 sm:space-y-8">
        <EntityForm />
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-trnet-text">
            Kayıtlı varlıklar
          </h2>
          <EntitiesTable entities={entities} />
        </section>
      </div>
    </>
  );
}
