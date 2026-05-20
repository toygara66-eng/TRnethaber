"use server";

import { revalidatePath } from "next/cache";
import { applyConstitutionRules } from "@/lib/constitution/text";
import { slugifyTitle } from "@/lib/slug";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type EntityFormState = {
  ok: boolean;
  error?: string;
};

const ENTITY_TYPES = ["kisi", "takim", "kurum"] as const;

export async function createEntity(
  _prev: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const name = applyConstitutionRules(String(formData.get("name") ?? "").trim());
  let slug = String(formData.get("slug") ?? "").trim();
  const entity_type = String(formData.get("entity_type") ?? "").trim();
  const bio_content = applyConstitutionRules(String(formData.get("bio_content") ?? "").trim());
  const anlik_durum_neden_gundemde = applyConstitutionRules(
    String(formData.get("anlik_durum_neden_gundemde") ?? "").trim(),
  );
  const image_url = String(formData.get("image_url") ?? "").trim();

  if (!name) {
    return { ok: false, error: "Varlık adı zorunludur." };
  }
  if (!slug) slug = slugifyTitle(name);
  if (!ENTITY_TYPES.includes(entity_type as (typeof ENTITY_TYPES)[number])) {
    return { ok: false, error: "Geçerli bir varlık türü seçin." };
  }
  const entityType = entity_type as (typeof ENTITY_TYPES)[number];
  if (!bio_content) {
    return { ok: false, error: "Biyografi metni zorunludur." };
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.from("entities").insert({
      name,
      slug,
      entity_type: entityType,
      bio_content,
      anlik_durum_neden_gundemde: anlik_durum_neden_gundemde || null,
      image_url: image_url || null,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Bu slug zaten kullanılıyor. Farklı bir ad veya slug deneyin." };
      }
      return { ok: false, error: error.message };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kayıt başarısız.";
    return { ok: false, error: message };
  }

  revalidatePath("/admin/varliklar");
  revalidatePath(`/kimdir/${slug}`);

  return { ok: true };
}
