import Link from "next/link";
import { getAdminCategories } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminKategorilerPage() {
  const categories = await getAdminCategories();

  return (
    <>
      <header className="border-b border-black/[0.06] bg-trnet-card px-4 py-4 shadow-sm sm:px-6 sm:py-5 lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-trnet-text">Kategoriler</h1>
        <p className="mt-1 text-sm text-trnet-text/55">Faz 6 ile düzenleme arayüzü eklenecek.</p>
      </header>
      <div className="admin-page !pt-4 sm:!pt-6">
        <div className="admin-card overflow-hidden">
          <ul className="divide-y divide-black/[0.05]">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <span
                  className={`font-medium text-trnet-text ${cat.parent_id ? "pl-0 text-sm sm:pl-6" : ""}`}
                >
                  {cat.parent_id ? "↳ " : ""}
                  {cat.name}
                </span>
                <span className="font-mono text-xs text-trnet-text/45">{cat.slug}</span>
              </li>
            ))}
          </ul>
          {categories.length === 0 ? (
            <p className="p-8 text-center text-trnet-text/50">Kategori yok.</p>
          ) : null}
        </div>
        <Link href="/admin" className="mt-6 inline-block text-sm text-trnet-primary hover:underline">
          ← Haber yönetimine dön
        </Link>
      </div>
    </>
  );
}
