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
    <div className="flex-1 space-y-2 p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-trnet-text">Haber Düzenle</h1>
          <p className="mt-1 text-sm text-trnet-text/60">
            {article.is_published ? "Yayında" : "Yayın durduruldu"} · /haber/{article.slug}
          </p>
        </div>
        <Link
          href="/admin/articles"
          className="text-sm font-semibold text-trnet-primary hover:underline"
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
