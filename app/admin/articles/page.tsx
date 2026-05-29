import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { ArticlesTableActions } from "@/components/admin/ArticlesTableActions";
import { getAdminArticles } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const articles = await getAdminArticles();

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-trnet-text">Haber Yönetimi</h1>
          <p className="mt-1 text-sm text-trnet-text/60">
            Yayın durumu, düzenleme ve silme işlemleri.
          </p>
        </div>
        <Link
          href="/admin/haber-ekle"
          className="inline-flex items-center gap-2 rounded-full bg-trnet-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-trnet-breaking"
        >
          <PlusCircle className="h-4 w-4" aria-hidden />
          Haber Ekle
        </Link>
      </div>

      <ArticlesTableActions articles={articles} />
    </div>
  );
}
