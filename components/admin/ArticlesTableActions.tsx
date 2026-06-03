"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { AdminArticlesSearchBar } from "@/components/admin/AdminArticlesSearchBar";
import { AdminArticlesSortBar } from "@/components/admin/AdminArticlesSortBar";
import { ArticleSocialShareIcons } from "@/components/admin/ArticleSocialShareIcons";
import {
  deleteArticle,
  toggleArticlePublish,
  updateArticleCategory,
  updateArticleHeadlineFlag,
} from "@/lib/actions/admin-articles";
import type { HeadlineField } from "@/lib/articles/headline-automation";
import type {
  AdminArticleRow,
  AdminArticlesSort,
  AdminCategoryOption,
} from "@/lib/queries/admin";

type Props = {
  articles: AdminArticleRow[];
  categories: AdminCategoryOption[];
  sort: AdminArticlesSort;
};

type VitrinField = HeadlineField;

type AdminToast = {
  type: "success" | "error";
  message: string;
};

function vitrinBusyKey(articleId: string, field: VitrinField): string {
  return `${articleId}:${field}`;
}

function AdminToastBanner({ toast }: { toast: AdminToast | null }) {
  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
        isSuccess
          ? "border-emerald-500/30 bg-emerald-950 text-emerald-50"
          : "border-trnet-breaking/40 bg-trnet-black text-white"
      }`}
    >
      {toast.message}
    </div>
  );
}

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

function categoryLabel(cat: AdminCategoryOption, all: AdminCategoryOption[]): string {
  if (!cat.parent_id) return cat.name;
  const parent = all.find((c) => c.id === cat.parent_id);
  return parent ? `${parent.name} › ${cat.name}` : cat.name;
}

function MansetToggle({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`inline-flex items-center gap-2 text-xs font-medium text-trnet-text/80 ${
        disabled ? "cursor-wait opacity-70" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-black/20 text-trnet-primary focus:ring-trnet-primary/30 disabled:opacity-50"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle()}
      />
      <span>{label}</span>
    </label>
  );
}

export function ArticlesTableActions({ articles, categories, sort }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(articles);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminArticleRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<AdminToast | null>(null);
  const [vitrinBusy, setVitrinBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setRows(articles);
  }, [articles]);

  const patchRowVitrin = useCallback(
    (articleId: string, field: VitrinField, value: boolean) => {
      setRows((prev) =>
        prev.map((row) => (row.id === articleId ? { ...row, [field]: value } : row)),
      );
    },
    [],
  );

  const handleVitrinToggle = useCallback(
    async (articleId: string, field: VitrinField, currentValue: boolean) => {
      const nextValue = !currentValue;
      const busyKey = vitrinBusyKey(articleId, field);

      setError(null);
      setVitrinBusy(busyKey);
      patchRowVitrin(articleId, field, nextValue);

      try {
        const result = await updateArticleHeadlineFlag(articleId, field, nextValue);
        if (!result.ok) {
          patchRowVitrin(articleId, field, currentValue);
          setToast({
            type: "error",
            message: result.error ?? "Manşet durumu güncellenemedi.",
          });
          return;
        }
        setToast({ type: "success", message: "Manşet durumu güncellendi" });
      } catch (err) {
        patchRowVitrin(articleId, field, currentValue);
        const message = err instanceof Error ? err.message : "Manşet durumu güncellenemedi.";
        setToast({ type: "error", message });
      } finally {
        setVitrinBusy((key) => (key === busyKey ? null : key));
      }
    },
    [patchRowVitrin],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    if (!q) return rows;
    return rows.filter((a) => a.title.toLocaleLowerCase("tr-TR").includes(q));
  }, [rows, search]);

  const onTogglePublish = (article: AdminArticleRow) => {
    startTransition(async () => {
      setError(null);
      const result = await toggleArticlePublish(article.id, !article.is_published);
      if (!result.ok) {
        setError(result.error ?? "Yayın durumu güncellenemedi.");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === article.id ? { ...r, is_published: !article.is_published } : r,
        ),
      );
      router.refresh();
    });
  };

  const onCategoryChange = (article: AdminArticleRow, categoryId: string) => {
    if (categoryId === article.category_id) return;
    const cat = categories.find((c) => c.id === categoryId);
    startTransition(async () => {
      setError(null);
      const result = await updateArticleCategory(article.id, categoryId);
      if (!result.ok) {
        setError(result.error ?? "Kategori güncellenemedi.");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === article.id
            ? {
                ...r,
                category_id: categoryId,
                category_name: cat?.name ?? r.category_name,
                category_slug: cat?.slug ?? r.category_slug,
              }
            : r,
        ),
      );
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
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      router.refresh();
    });
  };

  const categorySelect = (article: AdminArticleRow, className?: string) => (
    <select
      value={article.category_id || ""}
      disabled={pending}
      onChange={(e) => onCategoryChange(article, e.target.value)}
      className={
        className ??
        "max-w-[11rem] rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs font-medium text-trnet-text outline-none focus:border-trnet-primary/40 focus:ring-1 focus:ring-trnet-primary/20 disabled:opacity-50"
      }
      aria-label={`${article.title} kategorisi`}
    >
      <option value="" disabled>
        Kategori seç
      </option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {categoryLabel(cat, categories)}
        </option>
      ))}
    </select>
  );

  const mansetControls = (article: AdminArticleRow) => (
    <div className="flex flex-col gap-1.5">
      <MansetToggle
        label="Ana manşet"
        checked={Boolean(article.is_headline)}
        disabled={vitrinBusy === vitrinBusyKey(article.id, "is_headline")}
        onToggle={() =>
          void handleVitrinToggle(article.id, "is_headline", Boolean(article.is_headline))
        }
      />
      <MansetToggle
        label="Üst manşet"
        checked={Boolean(article.is_top_headline)}
        disabled={vitrinBusy === vitrinBusyKey(article.id, "is_top_headline")}
        onToggle={() =>
          void handleVitrinToggle(
            article.id,
            "is_top_headline",
            Boolean(article.is_top_headline),
          )
        }
      />
    </div>
  );

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
      <AdminToastBanner toast={toast} />
      <AdminArticlesSearchBar
        value={search}
        onChange={setSearch}
        resultCount={filtered.length}
        totalCount={rows.length}
      />
      <AdminArticlesSortBar current={sort} />

      {error ? (
        <p className="mb-4 rounded-lg border border-trnet-breaking/20 bg-trnet-breaking/10 px-4 py-3 text-sm text-trnet-breaking">
          {error}
        </p>
      ) : null}

      <div className="space-y-3 md:hidden">
        {filtered.map((article) => (
          <article key={article.id} className="admin-card space-y-3 p-4">
            <div>
              <p className="font-medium leading-snug text-trnet-text">{article.title}</p>
              <p className="mt-1 font-mono text-xs text-trnet-text/45">{article.slug}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="col-span-2">
                <dt className="mb-1 text-trnet-text/45">Kategori</dt>
                <dd>{categorySelect(article, "w-full max-w-none rounded-lg border border-black/10 bg-white px-2.5 py-2 text-sm")}</dd>
              </div>
              <div>
                <dt className="text-trnet-text/45">Okunma sayısı</dt>
                <dd className="font-mono font-semibold tabular-nums text-trnet-text">
                  {article.view_count.toLocaleString("tr-TR")}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="mb-1 text-trnet-text/45">Vitrin</dt>
                <dd>{mansetControls(article)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-trnet-text/45">Tarih</dt>
                <dd className="text-trnet-text/70">
                  {formatDate(article.published_at ?? article.created_at)}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  article.is_published
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-amber-500/10 text-amber-800"
                }`}
              >
                {article.is_published ? "Yayında" : "Durduruldu"}
              </span>
              <ArticleSocialShareIcons socialShared={article.social_shared} />
            </div>
            <div className="flex flex-col gap-2 border-t border-black/[0.06] pt-3">
              <Link href={`/admin/articles/${article.id}`} className="admin-btn-secondary">
                <Pencil className="h-4 w-4" aria-hidden />
                Düzenle
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => onTogglePublish(article)}
                className="admin-btn-secondary disabled:opacity-50"
              >
                {article.is_published ? "Yayını Durdur" : "Yayına Al"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setDeleteTarget(article)}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-trnet-breaking/30 px-5 py-3 text-sm font-semibold text-trnet-breaking hover:bg-trnet-breaking/5 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Sil
              </button>
              {article.is_published ? (
                <Link
                  href={`/haber/${article.slug}`}
                  target="_blank"
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 text-sm font-semibold text-trnet-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Görüntüle
                </Link>
              ) : null}
            </div>
          </article>
        ))}
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-black/[0.06] bg-trnet-card p-8 text-center text-sm text-trnet-text/60">
            Aramanızla eşleşen haber yok.
          </p>
        ) : null}
      </div>

      <div className="admin-card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] bg-trnet-surface/80">
                <th className="px-5 py-4 font-semibold text-trnet-text">Başlık</th>
                <th className="px-5 py-4 font-semibold text-trnet-text">Kategori</th>
                <th className="px-5 py-4 font-semibold text-trnet-text">Vitrin</th>
                <th className="px-5 py-4 font-semibold text-trnet-text">Okunma</th>
                <th className="px-5 py-4 font-semibold text-trnet-text">Yayın</th>
                <th className="px-5 py-4 font-semibold text-trnet-text">Tarih</th>
                <th className="px-4 py-4 font-semibold text-trnet-text">Sosyal</th>
                <th className="px-5 py-4 font-semibold text-trnet-text">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {filtered.map((article) => (
                <tr key={article.id} className="transition hover:bg-trnet-surface/50">
                  <td className="max-w-xs px-5 py-4">
                    <p className="line-clamp-2 font-medium text-trnet-text">{article.title}</p>
                    <p className="mt-0.5 font-mono text-xs text-trnet-text/45">{article.slug}</p>
                  </td>
                  <td className="px-5 py-4">{categorySelect(article)}</td>
                  <td className="px-5 py-4">{mansetControls(article)}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono tabular-nums text-trnet-text/80">
                    {article.view_count.toLocaleString("tr-TR")}
                  </td>
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
                        onClick={() => onTogglePublish(article)}
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
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-trnet-text/60">
              Aramanızla eşleşen haber yok.
            </p>
          ) : null}
        </div>
      </div>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <h2
              id="delete-modal-title"
              className="font-display text-xl font-semibold text-trnet-text"
            >
              Haberi sil
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-trnet-text/70">
              <strong>{deleteTarget.title}</strong> kalıcı olarak silinecek. Bu işlem geri
              alınamaz.
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
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-trnet-breaking px-5 py-3 text-sm font-semibold text-white hover:bg-trnet-primary disabled:opacity-50 sm:w-auto sm:py-2"
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
