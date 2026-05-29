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
  const is_breaking = formData.get("is_breaking") === "on";

  if (!title) {
    return { ok: false, error: "Başlık zorunludur." };
  }
  if (!slug) slug = slugifyTitle(title);
  if (!category_id) {
    return { ok: false, error: "Kategori seçin." };
  }

  try {
    const supabase = createSupabaseAdminClient();

    const baseInsert = {
      title,
      slug,
      spot_metni: spot_metni || null,
      content: content || "",
      kapak_gorseli: kapak_gorseli || null,
      category_id,
      okuma_sayisi: "0 okuma",
      is_breaking,
      yazar: "TRNETHABER Editör Masası",
      published_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from("articles")
      .insert({ ...baseInsert, view_count: 0 });

    if (error?.message?.includes("view_count")) {
      ({ error } = await supabase.from("articles").insert(baseInsert));
    }

    if (error?.message?.includes("is_published")) {
      ({ error } = await supabase.from("articles").insert(baseInsert));
    }

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
  revalidatePath("/admin/articles");
  redirect("/admin/articles");
}
