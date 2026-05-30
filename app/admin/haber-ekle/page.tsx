import { ArticleForm } from "@/components/admin/ArticleForm";
import { getAdminCategories } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminHaberEklePage() {
  const categories = await getAdminCategories();

  return (
    <>
      <header className="border-b border-black/[0.06] bg-trnet-card px-4 py-4 shadow-sm sm:px-6 sm:py-5 lg:px-8">
        <h1 className="font-display text-2xl font-semibold text-trnet-text sm:text-3xl">
          Haber Ekle
        </h1>
        <p className="mt-1 text-sm text-trnet-text/55">
          Yeni kayıt doğrudan Supabase articles tablosuna yazılır.
        </p>
      </header>

      <div className="admin-page !pt-4 sm:!pt-6">
        {categories.length === 0 ? (
          <div className="admin-card mx-auto max-w-2xl p-6 text-sm text-trnet-primary">
            Kategori bulunamadı. Önce supabase/seed.sql veya kategoriler sekmesinden kategori
            ekleyin.
          </div>
        ) : (
          <ArticleForm categories={categories} />
        )}
      </div>
    </>
  );
}
