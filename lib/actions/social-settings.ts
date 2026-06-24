"use server";

import { revalidatePath } from "next/cache";
import {
  DEFAULT_SOCIAL_PROFILES,
  SOCIAL_PROFILE_IDS,
  type SocialProfileId,
  type SocialProfileSettings,
} from "@/lib/data/social-links";
import { upsertSocialSettings } from "@/lib/queries/social-settings";

export type SocialSettingsFormState = {
  ok: boolean;
  error?: string;
};

function readProfileField(
  formData: FormData,
  id: SocialProfileId,
  field: "url" | "handle",
): string {
  return String(formData.get(`social_${id}_${field}`) ?? "").trim();
}

function normalizeUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

export async function saveSocialSettings(
  _prev: SocialSettingsFormState,
  formData: FormData,
): Promise<SocialSettingsFormState> {
  const settings = {} as SocialProfileSettings;

  for (const id of SOCIAL_PROFILE_IDS) {
    const url = normalizeUrl(readProfileField(formData, id, "url"));
    const handle = readProfileField(formData, id, "handle");

    if (url && !/^https?:\/\//i.test(url)) {
      return {
        ok: false,
        error: `${DEFAULT_SOCIAL_PROFILES[id].label} için geçerli bir URL girin.`,
      };
    }

    settings[id] = { url, handle };
  }

  try {
    await upsertSocialSettings(settings);
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sosyal medya ayarları kaydedilemedi.",
    };
  }
}
