"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugifyTitle } from "@/lib/slug";

export type ArticleFormState = {
  ok: boolean;
  error?: string;
};

export async function createArticle(
  _prev: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  const title = String(formData.get("title") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim();
  const spot_metni = String(formData.get("spot_metni") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const kapak_gorseli = String(formData.get("kapak_gorseli") ?? "").trim();
  const category_id = String(formData.get("category_id") ?? "").trim();
  const okuma_sayisi = String(formData.get("okuma_sayisi") ?? "").trim();
  const is_breaking = formData.get("is_breaking") === "on";

  if (!title) {
    return { ok: false, error: "Başlık zorunludur." };
  }
  if (!slug) slug = slugifyTitle(title);
  if (!category_id) {
    return { ok: false, error: "Kategori seçin." };
  }
  if (!okuma_sayisi) {
    return { ok: false, error: "Okunma sayısı zorunludur (örnek: 15 bin 350 okuma)." };
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.from("articles").insert({
      title,
      slug,
      spot_metni: spot_metni || null,
      content: content || "",
      kapak_gorseli: kapak_gorseli || null,
      category_id,
      okuma_sayisi,
      is_breaking,
      yazar: "TRNETHABER Editör Masası",
      published_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Bu slug zaten kullanılıyor. Farklı bir slug deneyin." };
      }
      return { ok: false, error: error.message };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kayıt başarısız.";
    return { ok: false, error: message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}
