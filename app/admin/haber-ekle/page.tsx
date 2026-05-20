import { ArticleForm } from "@/components/admin/ArticleForm";
import { getAdminCategories } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminHaberEklePage() {
  const categories = await getAdminCategories();

  return (
    <>
      <header className="border-b border-black/[0.06] bg-trnet-card px-6 py-5 shadow-sm lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-trnet-text sm:text-3xl">
          Haber Ekle
        </h1>
        <p className="mt-1 text-sm text-trnet-text/55">
          Yeni kayıt doğrudan Supabase articles tablosuna yazılır.
        </p>
      </header>

      <div className="flex-1 p-6 lg:p-8">
        <div className="admin-card mx-auto max-w-4xl p-6 sm:p-8">
          {categories.length === 0 ? (
            <p className="text-sm text-trnet-primary">
              Kategori bulunamadı. Önce supabase/seed.sql veya kategoriler sekmesinden kategori
              ekleyin.
            </p>
          ) : (
            <ArticleForm categories={categories} />
          )}
        </div>
      </div>
    </>
  );
}
