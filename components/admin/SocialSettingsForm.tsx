"use client";

import { useFormState } from "react-dom";
import type { SocialSettingsFormState } from "@/lib/actions/social-settings";
import {
  DEFAULT_SOCIAL_PROFILES,
  SOCIAL_PROFILE_IDS,
  type SocialProfileSettings,
} from "@/lib/data/social-links";

type Props = {
  settings: SocialProfileSettings;
  saveAction: (
    prev: SocialSettingsFormState,
    formData: FormData,
  ) => Promise<SocialSettingsFormState>;
};

export function SocialSettingsForm({ settings, saveAction }: Props) {
  const [state, formAction] = useFormState(saveAction, { ok: false });

  return (
    <form action={formAction} className="admin-card w-full max-w-2xl overflow-hidden">
      {state.error ? (
        <p className="border-b border-trnet-breaking/20 bg-trnet-breaking/10 px-5 py-3 text-sm text-trnet-breaking">
          {state.error}
        </p>
      ) : null}
      {state.ok && !state.error ? (
        <p className="border-b border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-800">
          Sosyal medya bağlantıları kaydedildi. Ana sayfa sağ sütunu güncellendi.
        </p>
      ) : null}

      <div className="space-y-6 p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-trnet-text/60">
          Ana sayfadaki &quot;Sosyal Medyada Bizi Takip Edin&quot; kutusunda gösterilir.
          URL alanını boş bırakırsanız ilgili platform gizlenir.
        </p>

        {SOCIAL_PROFILE_IDS.map((id) => {
          const label = DEFAULT_SOCIAL_PROFILES[id].label;
          const value = settings[id];

          return (
            <fieldset
              key={id}
              className="rounded-xl border border-black/[0.08] bg-trnet-surface/40 p-4"
            >
              <legend className="px-1 text-sm font-semibold text-trnet-text">{label}</legend>
              <div className="mt-3 space-y-4">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wide text-trnet-text/55"
                    htmlFor={`social_${id}_url`}
                  >
                    Profil URL
                  </label>
                  <input
                    id={`social_${id}_url`}
                    name={`social_${id}_url`}
                    type="url"
                    defaultValue={value.url}
                    placeholder={DEFAULT_SOCIAL_PROFILES[id].href}
                    className="admin-input mt-1.5 w-full font-mono text-sm"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wide text-trnet-text/55"
                    htmlFor={`social_${id}_handle`}
                  >
                    Görünen ad (isteğe bağlı)
                  </label>
                  <input
                    id={`social_${id}_handle`}
                    name={`social_${id}_handle`}
                    type="text"
                    defaultValue={value.handle}
                    placeholder={DEFAULT_SOCIAL_PROFILES[id].handle}
                    className="admin-input mt-1.5 w-full text-sm"
                  />
                </div>
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="border-t border-black/[0.06] bg-trnet-surface/50 px-5 py-4">
        <button
          type="submit"
          className="rounded-full bg-trnet-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-trnet-breaking"
        >
          Sosyal medyayı kaydet
        </button>
      </div>
    </form>
  );
}
