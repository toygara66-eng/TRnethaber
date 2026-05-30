import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ArticlesTableActions } from "@/components/admin/ArticlesTableActions";
import { getAdminArticles } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const articles = await getAdminArticles();

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

      <ArticlesTableActions articles={articles} />
    </div>
  );
}
