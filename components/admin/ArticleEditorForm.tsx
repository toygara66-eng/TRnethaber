"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import {
  AdminArticleEditorShell,
  AdminField,
  AdminSidebarCard,
} from "@/components/admin/AdminArticleEditorShell";
import { CoverImageUpload } from "@/components/admin/CoverImageUpload";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import type { ActionResult } from "@/lib/actions/admin-articles";
import type { AdminCategoryOption } from "@/lib/queries/admin";
import type { AdminArticleEdit } from "@/lib/queries/admin-article";
import { slugifyTitle } from "@/lib/slug";

type Props = {
  article: AdminArticleEdit;
  categories: AdminCategoryOption[];
  saveAction: (
    prev: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
};

function FormStatus({ state }: { state: ActionResult }) {
  if (state.error) {
    return (
      <div className="admin-card border-trnet-breaking/20 bg-trnet-breaking/10 px-5 py-3 text-sm text-trnet-breaking">
        {state.error}
      </div>
    );
  }
  if (state.ok) {
    return (
      <div className="admin-card border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-800">
        Haber kaydedildi.
      </div>
    );
  }
  return null;
}

export function ArticleEditorForm({ article, categories, saveAction }: Props) {
  const [state, formAction] = useFormState(saveAction, { ok: false });
  const [title, setTitle] = useState(article.title);
  const [slug, setSlug] = useState(article.slug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugifyTitle(title));
    }
  }, [title, slugTouched]);

  return (
    <AdminArticleEditorShell
      action={formAction}
      submitBlocked={coverUploading}
      status={<FormStatus state={state} />}
      main={
        <>
          <AdminField label="Başlık" htmlFor="title">
            <input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="admin-input text-lg font-medium"
            />
          </AdminField>

          <AdminField label="Spot metni" htmlFor="spot_metni">
            <textarea
              id="spot_metni"
              name="spot_metni"
              rows={4}
              defaultValue={article.spot_metni}
              className="admin-input resize-y leading-relaxed"
            />
          </AdminField>

          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-trnet-text">İçerik</h2>
              <p className="mt-1 text-xs text-trnet-text/50">
                WordPress / Medium tarzı — odak içerikte, teknik alanlar sağ panelde.
              </p>
            </div>
            <RichTextEditor
              name="content"
              initialContent={article.content}
              required
              minHeight={520}
            />
          </div>
        </>
      }
      sidebar={
        <>
          <AdminSidebarCard title="Yayın ayarları">
            <AdminField
              label="Slug"
              htmlFor="slug"
              hint="URL yolu; benzersiz olmalıdır."
            >
              <input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                className="admin-input font-mono text-sm"
              />
            </AdminField>

            <AdminField label="Kategori" htmlFor="category_id">
              <select
                id="category_id"
                name="category_id"
                required
                defaultValue={article.category_id}
                className="admin-input"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </AdminField>
          </AdminSidebarCard>

          <AdminSidebarCard
            title="Kapak görseli"
            hint="Yeni dosya yüklendiğinde mevcut kapak değiştirilir."
          >
            <CoverImageUpload
              initialUrl={article.kapak_gorseli}
              onUploadingChange={setCoverUploading}
            />
          </AdminSidebarCard>

          <AdminSidebarCard
            title="İstatistik"
            hint="Gerçek ziyaretçi trafiği ayrı sayılır; yalnızca admin ve En Çok Okunanlar için."
          >
            <AdminField label="Okunma sayısı (Hit)" htmlFor="view_count">
              <input
                id="view_count"
                name="view_count"
                type="number"
                min={0}
                step={1}
                defaultValue={article.view_count}
                className="admin-input"
              />
            </AdminField>
            <p className="text-xs text-trnet-text/45">
              Durum: {article.is_published ? "Yayında" : "Yayın durduruldu"}
            </p>
          </AdminSidebarCard>
        </>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="submit"
            disabled={coverUploading}
            className="rounded-full bg-trnet-primary px-8 py-3 text-sm font-semibold text-white shadow-md shadow-trnet-primary/20 transition hover:bg-trnet-breaking disabled:cursor-not-allowed disabled:opacity-50"
          >
            {coverUploading ? "Kapak yükleniyor…" : "Kaydet"}
          </button>
          <Link
            href="/admin/articles"
            className="text-sm font-medium text-trnet-text/60 hover:text-trnet-text"
          >
            ← Listeye dön
          </Link>
        </div>
      }
    />
  );
}
