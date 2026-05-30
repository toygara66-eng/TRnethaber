"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  AdminArticleEditorShell,
  AdminField,
  AdminSidebarCard,
} from "@/components/admin/AdminArticleEditorShell";
import { CoverImageUpload } from "@/components/admin/CoverImageUpload";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { createArticle, type ArticleFormState } from "@/lib/actions/articles";
import { slugifyTitle } from "@/lib/slug";
import type { AdminCategoryOption } from "@/lib/queries/admin";

const initialState: ArticleFormState = { ok: false };

const CONSTITUTION_CONTENT =
  "DİKKAT: Rakamları noktasız ve harfle yazın (Örn: 15 bin 350). Yüzdelik dilimleri kelimeyle yazın (Örn: yüzde 35). Kurum adlarında kesme işareti kullanmayın.";

type Props = {
  categories: AdminCategoryOption[];
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="admin-btn-primary disabled:opacity-60"
    >
      {pending ? "Kaydediliyor…" : "Haberi yayınla"}
    </button>
  );
}

function FormAlerts({ state }: { state: ArticleFormState }) {
  if (!state.error) return null;
  return (
    <div
      role="alert"
      className="admin-card rounded-xl border border-trnet-primary/30 bg-trnet-primary/5 px-5 py-3 text-sm text-trnet-primary"
    >
      {state.error}
    </div>
  );
}

export function ArticleForm({ categories }: Props) {
  const [state, formAction] = useFormState(createArticle, initialState);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
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
      status={<FormAlerts state={state} />}
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
              placeholder="Haber başlığı"
            />
          </AdminField>

          <AdminField label="Spot metni" htmlFor="spot_metni">
            <textarea
              id="spot_metni"
              name="spot_metni"
              rows={4}
              className="admin-input resize-y leading-relaxed"
              placeholder="Kısa özet / dek — ana sayfada görünür"
            />
          </AdminField>

          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-trnet-text">İçerik</h2>
              <p className="mt-1 text-xs text-trnet-text/50">
                H2, H3, kalın, italik, liste, alıntı ve link — gazetecilik odaklı sade araçlar.
              </p>
            </div>
            <RichTextEditor name="content" required minHeight={520} />
            <p className="admin-constitution">{CONSTITUTION_CONTENT}</p>
          </div>
        </>
      }
      sidebar={
        <>
          <AdminSidebarCard title="Yayın ayarları">
            <AdminField
              label="Slug"
              htmlFor="slug"
              hint="Başlıktan otomatik üretilir; düzenleyebilirsiniz."
            >
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                className="admin-input font-mono text-sm"
                placeholder="haber-url-slug"
              />
            </AdminField>

            <AdminField label="Kategori" htmlFor="category_id">
              <select
                id="category_id"
                name="category_id"
                required
                defaultValue=""
                className="admin-input"
              >
                <option value="" disabled>
                  Kategori seçin
                </option>
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
            hint="Soyut görsel tercih edin; yüz ve yazı içermesin. Dosya seçildiğinde otomatik yüklenir."
          >
            <CoverImageUpload onUploadingChange={setCoverUploading} />
          </AdminSidebarCard>

          <AdminSidebarCard title="Öncelik">
            <label
              htmlFor="is_breaking"
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/[0.06] bg-trnet-surface/50 px-3 py-3"
            >
              <input
                id="is_breaking"
                name="is_breaking"
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-black/20 text-trnet-primary focus:ring-trnet-primary"
              />
              <span>
                <span className="block text-sm font-semibold text-trnet-text">Son dakika</span>
                <span className="text-xs text-trnet-text/50">
                  Aktifse üst bantta öncelikli gösterilir
                </span>
              </span>
            </label>
          </AdminSidebarCard>
        </>
      }
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SubmitButton disabled={coverUploading} />
          <Link
            href="/admin"
            className="inline-flex min-h-[44px] w-full items-center justify-center text-sm font-medium text-trnet-text/60 hover:text-trnet-text sm:w-auto"
          >
            İptal
          </Link>
        </div>
      }
    />
  );
}
