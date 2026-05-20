"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { createArticle, type ArticleFormState } from "@/lib/actions/articles";
import { slugifyTitle } from "@/lib/slug";
import type { AdminCategoryOption } from "@/lib/queries/admin";

const initialState: ArticleFormState = { ok: false };

const CONSTITUTION_READ =
  "DİKKAT: Rakamları noktasız ve harfle yazın (Örn: 15 bin 350). Yüzdelik dilimleri kelimeyle yazın (Örn: yüzde 35). Kurum adlarında kesme işareti kullanmayın.";

const CONSTITUTION_CONTENT =
  "DİKKAT: Rakamları noktasız ve harfle yazın (Örn: 15 bin 350). Yüzdelik dilimleri kelimeyle yazın (Örn: yüzde 35). Kurum adlarında kesme işareti kullanmayın.";

type Props = {
  categories: AdminCategoryOption[];
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-trnet-primary px-8 py-3 text-sm font-semibold text-white shadow-md shadow-trnet-primary/20 transition hover:bg-trnet-breaking disabled:opacity-60"
    >
      {pending ? "Kaydediliyor…" : "Haberi yayınla"}
    </button>
  );
}

export function ArticleForm({ categories }: Props) {
  const [state, formAction] = useFormState(createArticle, initialState);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugifyTitle(title));
    }
  }, [title, slugTouched]);

  return (
    <form action={formAction} className="space-y-8">
      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-trnet-primary/30 bg-trnet-primary/5 px-4 py-3 text-sm text-trnet-primary"
        >
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-semibold text-trnet-text">
            Başlık
          </label>
          <input
            id="title"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="admin-input"
            placeholder="Haber başlığı"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="slug" className="text-sm font-semibold text-trnet-text">
            Slug
          </label>
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
          <p className="text-xs text-trnet-text/45">Başlıktan otomatik üretilir; düzenleyebilirsiniz.</p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="spot_metni" className="text-sm font-semibold text-trnet-text">
          Spot metni
        </label>
        <textarea
          id="spot_metni"
          name="spot_metni"
          rows={3}
          className="admin-input resize-y"
          placeholder="Kısa özet / dek"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="content" className="text-sm font-semibold text-trnet-text">
          İçerik
        </label>
        <textarea
          id="content"
          name="content"
          rows={12}
          className="admin-input min-h-[280px] resize-y leading-relaxed"
          placeholder="Haber metni (paragraflar arasında boş satır bırakabilirsiniz)"
        />
        <p className="admin-constitution">{CONSTITUTION_CONTENT}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="kapak_gorseli" className="text-sm font-semibold text-trnet-text">
            Kapak görseli URL
          </label>
          <input
            id="kapak_gorseli"
            name="kapak_gorseli"
            type="url"
            className="admin-input text-sm"
            placeholder="https://images.unsplash.com/..."
          />
          <p className="text-xs text-trnet-text/45">Soyut görsel; yüz ve yazı içermesin.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="category_id" className="text-sm font-semibold text-trnet-text">
            Kategori
          </label>
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
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="okuma_sayisi" className="text-sm font-semibold text-trnet-text">
            Okunma sayısı
          </label>
          <input
            id="okuma_sayisi"
            name="okuma_sayisi"
            required
            defaultValue="0 okuma"
            className="admin-input"
            placeholder="15 bin 350 okuma"
          />
          <p className="admin-constitution">{CONSTITUTION_READ}</p>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-black/[0.06] bg-trnet-surface px-5 py-4">
          <input
            id="is_breaking"
            name="is_breaking"
            type="checkbox"
            className="h-5 w-5 rounded border-black/20 text-trnet-primary focus:ring-trnet-primary"
          />
          <label htmlFor="is_breaking" className="cursor-pointer">
            <span className="block text-sm font-semibold text-trnet-text">Son dakika</span>
            <span className="text-xs text-trnet-text/50">Aktifse üst bantta öncelikli gösterilir</span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-black/[0.06] pt-6">
        <SubmitButton />
        <Link
          href="/admin"
          className="text-sm font-medium text-trnet-text/60 hover:text-trnet-text"
        >
          İptal
        </Link>
      </div>
    </form>
  );
}
