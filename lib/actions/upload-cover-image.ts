"use server";

import { scheduleMediaLibraryTagging } from "@/lib/media/schedule-media-tagging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildUniqueNewsImagePath,
  COVER_UPLOAD_MAX_BYTES,
  isAllowedCoverMime,
  NEWS_IMAGES_BUCKET,
  newsImagePathFromPublicUrl,
  normalizeNewsImageFolder,
} from "@/lib/storage/news-images";

export type NewsImageUploadResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: string };

/** @deprecated NewsImageUploadResult */
export type CoverUploadResult = NewsImageUploadResult;

export async function uploadNewsImage(formData: FormData): Promise<NewsImageUploadResult> {
  const file = formData.get("file");
  const folder = normalizeNewsImageFolder(
    typeof formData.get("folder") === "string" ? String(formData.get("folder")) : undefined,
  );

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Geçerli bir görsel dosyası seçin." };
  }

  if (!isAllowedCoverMime(file.type)) {
    return {
      ok: false,
      error: "Yalnızca JPG, PNG veya WebP yükleyebilirsiniz.",
    };
  }

  if (file.size > COVER_UPLOAD_MAX_BYTES) {
    return { ok: false, error: "Dosya en fazla 8 MB olabilir." };
  }

  const path = buildUniqueNewsImagePath(file.type, folder);
  if (!path) {
    return { ok: false, error: "Desteklenmeyen dosya türü." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from(NEWS_IMAGES_BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const { data } = supabase.storage.from(NEWS_IMAGES_BUCKET).getPublicUrl(path);
    const url = data.publicUrl?.trim();
    if (!url) {
      return { ok: false, error: "Public URL alınamadı." };
    }

    scheduleMediaLibraryTagging({ url, storage_path: path });

    return { ok: true, url, path };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Yükleme başarısız.",
    };
  }
}

/** Haber kapak görseli — covers/ klasörü */
export async function uploadNewsCoverImage(
  formData: FormData,
): Promise<NewsImageUploadResult> {
  if (!formData.has("folder")) {
    formData.set("folder", "covers");
  }
  return uploadNewsImage(formData);
}

export async function deleteNewsImage(publicUrl: string): Promise<{ ok: boolean; error?: string }> {
  const path = newsImagePathFromPublicUrl(publicUrl);
  if (!path) {
    return { ok: true };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(NEWS_IMAGES_BUCKET).remove([path]);
    if (error) {
      return { ok: false, error: error.message };
    }

    const { deleteMediaLibraryByUrl } = await import("@/lib/media/media-library-db");
    await deleteMediaLibraryByUrl(publicUrl);

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Silme başarısız.",
    };
  }
}

/** @deprecated deleteNewsImage kullanın */
export const deleteNewsCoverImage = deleteNewsImage;
