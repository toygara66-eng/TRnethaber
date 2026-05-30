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
  const [articles, categories] = await Promise.all([
    getAdminArticles(sort),
    getAdminCategories(),
  ]);

  return (
    <div className="admin-page">
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
