import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleEditorForm } from "@/components/admin/ArticleEditorForm";
import { updateArticle } from "@/lib/actions/admin-articles";
import { getAdminCategories } from "@/lib/queries/admin";
import { getAdminArticleById } from "@/lib/queries/admin-article";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function AdminArticleEditPage({ params }: PageProps) {
  const [article, categories] = await Promise.all([
    getAdminArticleById(params.id),
    getAdminCategories(),
  ]);

  if (!article) {
    notFound();
  }

  const saveAction = updateArticle.bind(null, article.id);

  return (
    <div className="admin-page space-y-4">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-trnet-text sm:text-3xl">
            Haber Düzenle
          </h1>
          <p className="mt-1 break-all text-sm text-trnet-text/60">
            {article.is_published ? "Yayında" : "Yayın durduruldu"} · /haber/{article.slug}
          </p>
        </div>
        <Link
          href="/admin/articles"
          className="inline-flex min-h-[44px] w-full items-center justify-center text-sm font-semibold text-trnet-primary hover:underline sm:w-auto sm:justify-start"
        >
          ← Listeye dön
        </Link>
      </div>

      <ArticleEditorForm
        article={article}
        categories={categories}
        saveAction={saveAction}
      />
    </div>
  );
}
