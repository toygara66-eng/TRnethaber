import Link from "next/link";
import { getAdminCategories } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminKategorilerPage() {
  const categories = await getAdminCategories();

  return (
    <>
      <header className="border-b border-black/[0.06] bg-trnet-card px-6 py-5 shadow-sm lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-trnet-text">Kategoriler</h1>
        <p className="mt-1 text-sm text-trnet-text/55">Faz 6 ile düzenleme arayüzü eklenecek.</p>
      </header>
      <div className="flex-1 p-6 lg:p-8">
        <div className="rounded-2xl border border-black/[0.06] bg-trnet-card shadow-sm">
          <ul className="divide-y divide-black/[0.05]">
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-center justify-between px-5 py-4">
                <span className="font-medium text-trnet-text">{cat.name}</span>
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
