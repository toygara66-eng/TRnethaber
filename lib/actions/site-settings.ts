"use server";

import { revalidatePath } from "next/cache";
import { upsertSiteSettings } from "@/lib/queries/site-settings";

export type SettingsFormState = {
  ok: boolean;
  error?: string;
};

export async function saveSiteSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const logoSquareUrl = String(formData.get("logo_square_url") ?? "").trim();
  const logoRectangleUrl = String(formData.get("logo_rectangle_url") ?? "").trim();

  try {
    await upsertSiteSettings({
      logoSquareUrl: logoSquareUrl || undefined,
      logoRectangleUrl: logoRectangleUrl || undefined,
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Ayarlar kaydedilemedi.",
    };
  }
}
