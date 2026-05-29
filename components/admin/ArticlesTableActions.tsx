"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { ArticleSocialShareIcons } from "@/components/admin/ArticleSocialShareIcons";
import {
  deleteArticle,
  toggleArticlePublish,
} from "@/lib/actions/admin-articles";
import type { AdminArticleRow } from "@/lib/queries/admin";

type Props = {
  articles: AdminArticleRow[];
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ArticlesTableActions({ articles }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<AdminArticleRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onToggle = (article: AdminArticleRow) => {
    startTransition(async () => {
      setError(null);
      const result = await toggleArticlePublish(article.id, !article.is_published);
      if (!result.ok) {
        setError(result.error ?? "Yayın durumu güncellenemedi.");
        return;
      }
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteArticle(deleteTarget.id);
      if (!result.ok) {
        setError(result.error ?? "Silinemedi.");
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  };

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-trnet-card p-12 text-center shadow-sm">
        <p className="text-trnet-text/60">Henüz haber kaydı yok.</p>
        <Link
          href="/admin/haber-ekle"
          className="mt-4 inline-flex rounded-full bg-trnet-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-trnet-breaking"
        >
          İlk haberi ekle
        </Link>
      </div>
    );
  }

  return (
    <>
      {error ? (
        <p className="mb-4 rounded-lg border border-trnet-breaking/20 bg-trnet-breaking/10 px-4 py-3 text-sm text-trnet-breaking">
          {error}
        </p>
      ) : null}

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] bg-trnet-surface/80">
                <th className="px-5 py-4 font-semibold text-trnet-text">Başlık</th>
                <th className="px-5 py-4 font-semibold text-trnet-text">Kategori</th>
                <th className="px-5 py-4 font-semibold text-trnet-text">Yayın</th>
                <th className="px-5 py-4 font-semibold text-trnet-text">Tarih</th>
                <th className="px-4 py-4 font-semibold text-trnet-text">Sosyal</th>
                <th className="px-5 py-4 font-semibold text-trnet-text">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {articles.map((article) => (
                <tr key={article.id} className="transition hover:bg-trnet-surface/50">
                  <td className="max-w-xs px-5 py-4">
                    <p className="line-clamp-2 font-medium text-trnet-text">{article.title}</p>
                    <p className="mt-0.5 font-mono text-xs text-trnet-text/45">{article.slug}</p>
                  </td>
                  <td className="px-5 py-4 text-trnet-text/80">{article.category_name}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        article.is_published
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-amber-500/10 text-amber-800"
                      }`}
                    >
                      {article.is_published ? "Yayında" : "Durduruldu"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-trnet-text/60">
                    {formatDate(article.published_at ?? article.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <ArticleSocialShareIcons socialShared={article.social_shared} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold text-trnet-text hover:border-trnet-primary/40"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Düzenle
                      </Link>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onToggle(article)}
                        className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold text-trnet-text hover:border-trnet-primary/40 disabled:opacity-50"
                      >
                        {article.is_published ? "Yayını Durdur" : "Yayına Al"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setDeleteTarget(article)}
                        className="inline-flex items-center gap-1 rounded-lg border border-trnet-breaking/30 px-2.5 py-1.5 text-xs font-semibold text-trnet-breaking hover:bg-trnet-breaking/5 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Sil
                      </button>
                      {article.is_published ? (
                        <Link
                          href={`/haber/${article.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-medium text-trnet-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          Görüntüle
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="delete-modal-title" className="font-display text-xl font-semibold text-trnet-text">
              Haberi sil
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-trnet-text/70">
              <strong>{deleteTarget.title}</strong> kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-trnet-text"
                onClick={() => setDeleteTarget(null)}
                disabled={pending}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="rounded-full bg-trnet-breaking px-4 py-2 text-sm font-semibold text-white hover:bg-trnet-primary disabled:opacity-50"
                onClick={onDelete}
                disabled={pending}
              >
                Evet, sil
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
