import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ArticlesTableActions } from "@/components/admin/ArticlesTableActions";
import { getAdminArticles, getAdminCategories, type AdminArticlesSort } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { sort?: string };
};

export default async function AdminArticlesPage({ searchParams }: PageProps) {
  const sort: AdminArticlesSort =
    searchParams?.sort === "most_read" ? "most_read" : "newest";
  const [{ articles, error: articlesError }, categories] = await Promise.all([
    getAdminArticles(sort),
    getAdminCategories(),
  ]);

  return (
    <div className="admin-page">
      {articlesError ? (
        <div
          className="mb-4 rounded-lg border border-trnet-breaking/30 bg-trnet-breaking/10 px-4 py-3 text-sm text-trnet-breaking"
          role="alert"
        >
          <p className="font-semibold">Haberler yüklenemedi</p>
          <p className="mt-1 font-mono text-xs break-all text-trnet-breaking/90">{articlesError}</p>
          <p className="mt-2 text-trnet-text/70">
            Supabase bağlantısı veya eksik sütunlar (ör. <code>is_manset</code>) kontrol edin.
            Migration: <code>20260602_articles_manset_flags.sql</code>
          </p>
        </div>
      ) : null}

      <AdminPageHeader
        title="Haber Yönetimi"
        description="Yayın durumu, düzenleme ve silme işlemleri."
        action={
          <Link href="/admin/haber-ekle" className="admin-btn-primary">
            <PlusCircle className="h-4 w-4" aria-hidden />
            Haber Ekle
          </Link>
        }
      />

      <ArticlesTableActions articles={articles} categories={categories} sort={sort} />
    </div>
  );
}
