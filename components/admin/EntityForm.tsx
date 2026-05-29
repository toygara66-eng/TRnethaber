"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { createEntity, type EntityFormState } from "@/lib/actions/entities";
import { slugifyTitle } from "@/lib/slug";

const initialState: EntityFormState = { ok: false };

const ENTITY_TYPE_OPTIONS = [
  { value: "kisi", label: "Kişi" },
  { value: "kurum", label: "Kurum" },
  { value: "takim", label: "Takım" },
] as const;

const CONSTITUTION_HINT =
  "DİKKAT: Rakamları noktasız ve harfle yazın. Yüzdeleri kelimeyle yazın (yüzde 35). Kurum adlarında kesme işareti kullanmayın.";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-trnet-primary px-8 py-3 text-sm font-semibold text-white shadow-md shadow-trnet-primary/20 transition hover:bg-trnet-breaking disabled:opacity-60"
    >
      {pending ? "Kaydediliyor…" : "Varlığı kaydet"}
    </button>
  );
}

export function EntityForm() {
  const router = useRouter();
  const [state, formAction] = useFormState(createEntity, initialState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugifyTitle(name));
    }
  }, [name, slugTouched]);

  useEffect(() => {
    if (state.ok) {
      setName("");
      setSlug("");
      setSlugTouched(false);
      const form = document.getElementById("entity-form") as HTMLFormElement | null;
      form?.reset();
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form id="entity-form" action={formAction} className="admin-card space-y-6 p-6 lg:p-8">
      <div>
        <h2 className="font-display text-xl font-semibold text-trnet-text">Yeni varlık ekle</h2>
        <p className="mt-1 text-sm text-trnet-text/55">
          Kayıt Supabase entities tablosuna yazılır; slug otomatik üretilir.
        </p>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-trnet-primary/30 bg-trnet-primary/5 px-4 py-3 text-sm text-trnet-primary"
        >
          {state.error}
        </div>
      ) : null}

      {state.ok ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          Varlık başarıyla eklendi. Liste güncellendi.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="entity-name" className="text-sm font-semibold text-trnet-text">
            Varlık adı
          </label>
          <input
            id="entity-name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="admin-input"
            placeholder="Türkiye Cumhuriyet Merkez Bankası"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="entity-slug" className="text-sm font-semibold text-trnet-text">
            Slug
          </label>
          <input
            id="entity-slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="admin-input font-mono text-sm"
            placeholder="turkiye-cumhuriyet-merkez-bankasi"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="entity_type" className="text-sm font-semibold text-trnet-text">
            Tür
          </label>
          <select id="entity_type" name="entity_type" required className="admin-input" defaultValue="">
            <option value="" disabled>
              Seçin…
            </option>
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <ImageUpload
          name="image_url"
          folder="entities"
          aspectRatio="16/10"
          label="Varlık görseli"
          hint="Soyut/kurumsal tercih edin; yüz ve yazı içermesin."
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="bio_content" className="text-sm font-semibold text-trnet-text">
          Biyografi
        </label>
        <textarea
          id="bio_content"
          name="bio_content"
          required
          rows={5}
          className="admin-input resize-y"
          placeholder="Kurum veya kişi hakkında kısa biyografi…"
        />
        <p className="admin-constitution">{CONSTITUTION_HINT}</p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="anlik_durum_neden_gundemde"
          className="text-sm font-semibold text-trnet-text"
        >
          Neden gündemde?
        </label>
        <textarea
          id="anlik_durum_neden_gundemde"
          name="anlik_durum_neden_gundemde"
          rows={3}
          className="admin-input resize-y"
          placeholder="Gündemde olma gerekçesi…"
        />
        <p className="admin-constitution">{CONSTITUTION_HINT}</p>
      </div>

      <SubmitButton />
    </form>
  );
}
