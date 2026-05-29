"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Radio, Trash2, X } from "lucide-react";
import {
  deleteRssSourceAction,
  saveRssSourceAction,
  toggleRssSourceAction,
} from "@/lib/actions/rss-sources-admin";
import type { AdminCategoryOption } from "@/lib/queries/admin";
import type { RssSourceRow } from "@/lib/queries/rss-sources";

type Props = {
  sources: RssSourceRow[];
  categories: AdminCategoryOption[];
  cityOptions: string[];
};

type FormState = {
  id?: string;
  name: string;
  url: string;
  city: string;
  category: string;
};

const emptyForm = (): FormState => ({
  name: "",
  url: "",
  city: "",
  category: "",
});

function StatusSwitch({
  active,
  disabled,
  onChange,
}: {
  active: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        active ? "bg-trnet-primary" : "bg-black/15"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          active ? "translate-x-6" : "translate-x-1"
        }`}
      />
      <span className="sr-only">{active ? "Aktif" : "Pasif"}</span>
    </button>
  );
}

function SourceModal({
  open,
  title,
  form,
  categories,
  cityOptions,
  pending,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  form: FormState;
  categories: AdminCategoryOption[];
  cityOptions: string[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-black/[0.06] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between border-b border-black/[0.06] px-6 py-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-trnet-text">{title}</h2>
            <p className="mt-1 text-sm text-trnet-text/50">
              RSS akışı bilgilerini girin; bot yalnızca aktif kaynakları kullanır.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-trnet-text/50 hover:bg-trnet-surface"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error ? (
            <p className="rounded-lg border border-trnet-breaking/20 bg-trnet-breaking/10 px-3 py-2 text-sm text-trnet-breaking">
              {error}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="rss-name" className="text-sm font-semibold text-trnet-text">
              Kaynak adı
            </label>
            <input
              id="rss-name"
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="admin-input"
              placeholder="Örn: Hürriyet Gündem"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rss-url" className="text-sm font-semibold text-trnet-text">
              RSS URL
            </label>
            <input
              id="rss-url"
              type="url"
              value={form.url}
              onChange={(e) => onChange({ url: e.target.value })}
              className="admin-input font-mono text-sm"
              placeholder="https://…/rss.xml"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="rss-city" className="text-sm font-semibold text-trnet-text">
                Şehir
              </label>
              <select
                id="rss-city"
                value={form.city}
                onChange={(e) => onChange({ city: e.target.value })}
                className="admin-input"
              >
                <option value="">Ulusal / Genel</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rss-category" className="text-sm font-semibold text-trnet-text">
                Kategori
              </label>
              <select
                id="rss-category"
                value={form.category}
                onChange={(e) => onChange({ category: e.target.value })}
                className="admin-input"
              >
                <option value="">Seçin</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-black/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-trnet-text"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending}
            className="rounded-full bg-trnet-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-trnet-primary/20 hover:bg-trnet-breaking disabled:opacity-50"
          >
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RssSourcesManager({ sources, categories, cityOptions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const activeCount = useMemo(
    () => sources.filter((s) => s.is_active).length,
    [sources],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: RssSourceRow) => {
    setForm({
      id: row.id,
      name: row.name,
      url: row.url,
      city: row.city,
      category: row.category,
    });
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!pending) setModalOpen(false);
  };

  const submitForm = () => {
    const body = new FormData();
    if (form.id) body.set("id", form.id);
    body.set("name", form.name);
    body.set("url", form.url);
    body.set("city", form.city);
    body.set("category", form.category);

    startTransition(async () => {
      setError(null);
      const result = await saveRssSourceAction({ ok: false }, body);
      if (!result.ok) {
        setError(result.error ?? "Kayıt başarısız.");
        return;
      }
      setModalOpen(false);
      router.refresh();
    });
  };

  const onToggle = (id: string, next: boolean) => {
    startTransition(async () => {
      setError(null);
      const result = await toggleRssSourceAction(id, next);
      if (!result.ok) setError(result.error ?? "Durum güncellenemedi.");
      else router.refresh();
    });
  };

  const onDelete = (row: RssSourceRow) => {
    if (!window.confirm(`"${row.name}" kaynağını silmek istediğinize emin misiniz?`)) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteRssSourceAction(row.id);
      if (!result.ok) setError(result.error ?? "Silinemedi.");
      else router.refresh();
    });
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-trnet-primary/10 text-trnet-primary">
            <Radio className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm text-trnet-text/55">
              {sources.length} kayıt · {activeCount} aktif
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-trnet-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-trnet-primary/25 transition hover:bg-trnet-breaking"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Yeni Kaynak Ekle
        </button>
      </div>

      {error && !modalOpen ? (
        <p className="mb-4 rounded-lg border border-trnet-breaking/20 bg-trnet-breaking/10 px-4 py-3 text-sm text-trnet-breaking">
          {error}
        </p>
      ) : null}

      <section className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] bg-trnet-surface/60">
                <th className="px-5 py-3.5 font-semibold text-trnet-text">Kaynak adı</th>
                <th className="px-5 py-3.5 font-semibold text-trnet-text">RSS URL</th>
                <th className="px-5 py-3.5 font-semibold text-trnet-text">Şehir</th>
                <th className="px-5 py-3.5 font-semibold text-trnet-text">Kategori</th>
                <th className="px-5 py-3.5 font-semibold text-trnet-text">Durum</th>
                <th className="px-5 py-3.5 text-right font-semibold text-trnet-text">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <p className="font-medium text-trnet-text/60">Henüz RSS kaynağı yok.</p>
                    <p className="mt-1 text-sm text-trnet-text/45">
                      Sağ üstten ilk kaynağınızı ekleyin veya Supabase migration dosyasını
                      çalıştırın.
                    </p>
                  </td>
                </tr>
              ) : (
                sources.map((row) => (
                  <tr key={row.id} className="transition hover:bg-trnet-surface/40">
                    <td className="px-5 py-4 font-medium text-trnet-text">{row.name}</td>
                    <td className="max-w-xs px-5 py-4">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-2 font-mono text-xs text-trnet-primary hover:underline"
                      >
                        {row.url}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-trnet-text/80">
                      {row.city || "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-full bg-trnet-surface px-2.5 py-1 text-xs font-medium text-trnet-text/70">
                        {row.category || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <StatusSwitch
                          active={row.is_active}
                          disabled={pending}
                          onChange={(next) => onToggle(row.id, next)}
                        />
                        <span
                          className={`text-xs font-semibold ${
                            row.is_active ? "text-emerald-700" : "text-amber-800"
                          }`}
                        >
                          {row.is_active ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold text-trnet-text hover:bg-trnet-surface disabled:opacity-50"
                          title="Düzenle"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Düzenle
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onDelete(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-trnet-breaking/25 px-2.5 py-1.5 text-xs font-semibold text-trnet-breaking hover:bg-trnet-breaking/5 disabled:opacity-50"
                          title="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SourceModal
        open={modalOpen}
        title={form.id ? "Kaynağı düzenle" : "Yeni kaynak ekle"}
        form={form}
        categories={categories}
        cityOptions={cityOptions}
        pending={pending}
        error={error}
        onClose={closeModal}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={submitForm}
      />
    </>
  );
}
