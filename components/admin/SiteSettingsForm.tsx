"use client";

import { useFormState } from "react-dom";
import type { SettingsFormState } from "@/lib/actions/site-settings";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { SiteSettings } from "@/lib/queries/site-settings";

type Props = {
  settings: SiteSettings;
  saveAction: (
    prev: SettingsFormState,
    formData: FormData,
  ) => Promise<SettingsFormState>;
};

export function SiteSettingsForm({ settings, saveAction }: Props) {
  const [state, formAction] = useFormState(saveAction, { ok: false });

  return (
    <form action={formAction} className="admin-card max-w-2xl overflow-hidden">
      {state.error ? (
        <p className="border-b border-trnet-breaking/20 bg-trnet-breaking/10 px-5 py-3 text-sm text-trnet-breaking">
          {state.error}
        </p>
      ) : null}
      {state.ok && !state.error ? (
        <p className="border-b border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-800">
          Ayarlar kaydedildi.
        </p>
      ) : null}

      <div className="space-y-6 p-5 sm:p-6">
        <ImageUpload
          name="logo_square_url"
          initialUrl={settings.logoSquareUrl}
          folder="site"
          aspectRatio="square"
          label="Kare logo (512×512 px)"
          hint="Google Organization schema — kare yayın logosu."
        />

        <ImageUpload
          name="logo_rectangle_url"
          initialUrl={settings.logoRectangleUrl}
          folder="site"
          aspectRatio="banner"
          label="Dikdörtgen yayıncı logosu (600×60 px)"
          hint="NewsArticle JSON-LD — publisher.logo.url alanı."
        />
      </div>

      <div className="border-t border-black/[0.06] bg-trnet-surface/50 px-5 py-4">
        <button
          type="submit"
          className="rounded-full bg-trnet-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-trnet-breaking"
        >
          Kaydet
        </button>
      </div>
    </form>
  );
}
