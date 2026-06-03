"use server";

import { revalidatePath } from "next/cache";
import {
  enforceHeadlineSlotLimit,
  isMissingHeadlineColumn,
  type HeadlineField,
} from "@/lib/articles/headline-automation";
import {
  isMissingViewCountColumn,
  parseAdminViewCountInput,
} from "@/lib/articles/view-count-db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ActionResult = {
  ok: boolean;
  error?: string;
};

export async function toggleArticlePublish(
  articleId: string,
  publish: boolean,
): Promise<ActionResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const updatePayload: {
      is_published: boolean;
      updated_at: string;
      published_at?: string;
    } = {
      is_published: publish,
      updated_at: new Date().toISOString(),
    };
    if (publish) {
      updatePayload.published_at = new Date().toISOString();
    }

    let { error } = await supabase.from("articles").update(updatePayload).eq("id", articleId);

    if (error?.message?.includes("is_published")) {
      ({ error } = await supabase
        .from("articles")
        .update({
          published_at: publish ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", articleId));
    }

    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/admin/articles");
    revalidatePath("/sitemap.xml");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "İşlem başarısız." };
  }
}

export async function updateArticleCategory(
  articleId: string,
  categoryId: string,
): Promise<ActionResult> {
  if (!categoryId.trim()) {
    return { ok: false, error: "Kategori seçin." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("articles")
      .update({
        category_id: categoryId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/admin/articles");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Kategori güncellenemedi." };
  }
}

export async function updateArticleHeadlineFlag(
  articleId: string,
  field: HeadlineField,
  value: boolean,
): Promise<ActionResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const updated_at = new Date().toISOString();

    const patch =
      field === "is_headline"
        ? {
            is_headline: value,
            is_ust_manset: value,
            updated_at,
            ...(value ? { is_top_headline: false, is_manset: false } : {}),
          }
        : {
            is_top_headline: value,
            is_manset: value,
            updated_at,
            ...(value ? { is_headline: false, is_ust_manset: false } : {}),
          };

    const { error } = await supabase.from("articles").update(patch).eq("id", articleId);

    if (error?.message && isMissingHeadlineColumn(error.message)) {
      const legacyPatch =
        field === "is_headline"
          ? { is_ust_manset: value, updated_at }
          : { is_manset: value, updated_at };
      const legacy = await supabase.from("articles").update(legacyPatch).eq("id", articleId);
      if (legacy.error) {
        return {
          ok: false,
          error:
            "Vitrin sütunları yok. Supabase'de 20260603_autonomous_headlines.sql migration'ını çalıştırın.",
        };
      }
    } else if (error) {
      return { ok: false, error: error.message };
    }

    if (field === "is_headline" && value) {
      await enforceHeadlineSlotLimit();
    }

    revalidatePath("/");
    revalidatePath("/api/home/vitrin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Manşet güncellenemedi." };
  }
}

/** @deprecated updateArticleHeadlineFlag kullanın */
export const updateArticleMansetFlag = updateArticleHeadlineFlag;

export async function deleteArticle(articleId: string): Promise<ActionResult> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("articles").delete().eq("id", articleId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/admin/articles");
    revalidatePath("/sitemap.xml");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Silme başarısız." };
  }
}

export async function updateArticle(
  articleId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const spot_metni = String(formData.get("spot_metni") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const kapak_gorseli = String(formData.get("kapak_gorseli") ?? "").trim();
  const category_id = String(formData.get("category_id") ?? "").trim();
  const viewCount = parseAdminViewCountInput(formData.get("view_count"));

  if (!title) return { ok: false, error: "Başlık zorunludur." };
  if (!slug) return { ok: false, error: "Slug zorunludur." };
  if (!category_id) return { ok: false, error: "Kategori seçin." };
  if (!content) return { ok: false, error: "İçerik zorunludur." };
  if (viewCount === null) {
    return { ok: false, error: "Okunma sayısı geçerli bir tam sayı olmalıdır (0 veya üzeri)." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const payload: {
      title: string;
      slug: string;
      spot_metni: string | null;
      content: string;
      kapak_gorseli: string | null;
      category_id: string;
      view_count?: number;
      updated_at: string;
    } = {
      title,
      slug,
      spot_metni: spot_metni || null,
      content,
      kapak_gorseli: kapak_gorseli || null,
      category_id,
      updated_at: new Date().toISOString(),
    };

    payload.view_count = viewCount;

    let { error } = await supabase.from("articles").update(payload).eq("id", articleId);

    if (error?.code === "23505") {
      return { ok: false, error: "Bu slug zaten kullanılıyor. Farklı bir slug deneyin." };
    }

    if (error?.message && isMissingViewCountColumn(error.message)) {
      const { view_count: _removed, ...withoutView } = payload;
      ({ error } = await supabase.from("articles").update(withoutView).eq("id", articleId));
    }

    if (error) return { ok: false, error: error.message };

    revalidatePath("/");
    revalidatePath("/admin/articles");
    revalidatePath(`/admin/articles/${articleId}`);
    revalidatePath(`/haber/${slug}`);
    revalidatePath("/api/articles/most-read");
    revalidatePath("/sitemap.xml");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Kayıt başarısız." };
  }
}
