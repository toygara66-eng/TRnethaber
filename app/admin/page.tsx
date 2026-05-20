import Link from "next/link";
import { Plus } from "lucide-react";
import { ArticlesTable } from "@/components/admin/ArticlesTable";
import { getAdminArticles } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const articles = await getAdminArticles();

  return (
    <>
      <header className="border-b border-black/[0.06] bg-trnet-card px-6 py-5 shadow-sm lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-trnet-text sm:text-3xl">
              Haber Yönetimi
            </h1>
            <p className="mt-1 text-sm text-trnet-text/55">
              Supabase articles tablosu — {articles.length} kayıt
            </p>
          </div>
          <Link
            href="/admin/haber-ekle"
            className="inline-flex items-center gap-2 rounded-full bg-trnet-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-trnet-primary/20 transition hover:bg-trnet-breaking"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Yeni haber
          </Link>
        </div>
      </header>

      <div className="flex-1 p-6 lg:p-8">
        <ArticlesTable articles={articles} />
      </div>
    </>
  );
}
