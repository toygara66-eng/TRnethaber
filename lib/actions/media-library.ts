"use server";

import { revalidatePath } from "next/cache";
import { deleteNewsImage, uploadNewsImage } from "@/lib/actions/upload-cover-image";
import {
  folderFromStoragePath,
  fetchMediaLibraryRows,
  fetchMediaLibraryRowsByUrls,
  deleteMediaLibraryByUrl,
  type MediaLibraryRow,
} from "@/lib/media/media-library-db";
import { scheduleMediaLibraryTagging } from "@/lib/media/schedule-media-tagging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  NEWS_IMAGES_BUCKET,
  type NewsImageFolder,
  normalizeNewsImageFolder,
} from "@/lib/storage/news-images";

export type MediaLibraryItem = {
  id: string;
  path: string;
  url: string;
  name: string;
  folder: NewsImageFolder;
  createdAt: string;
  altText: string;
  tags: string[];
  /** AI etiketleme henüz tamamlanmadı */
  taggingPending: boolean;
};

function rowToItem(row: MediaLibraryRow): MediaLibraryItem {
  const path = row.storage_path ?? "";
  const folder = folderFromStoragePath(row.storage_path);
  return {
    id: row.id,
    path,
    url: row.url,
    name: path.split("/").pop() ?? row.url,
    folder,
    createdAt: row.created_at,
    altText: row.alt_text,
    tags: row.tags ?? [],
    taggingPending: !row.alt_text?.trim() && (row.tags?.length ?? 0) === 0,
  };
}

/** Storage'da olup tabloda olmayan kayıtlar için hafif senkron (arka plan) */
async function backfillStorageIntoDb(limit = 30): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const folders: NewsImageFolder[] = ["covers", "inline", "entities", "site"];

  for (const folder of folders) {
    const { data } = await supabase.storage.from(NEWS_IMAGES_BUCKET).list(folder, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

    for (const entry of data ?? []) {
      if (!entry.id && !entry.metadata) continue; // klasör satırı
      if (!entry.name || entry.name.endsWith("/")) continue;
      const storagePath = `${folder}/${entry.name}`;
      const { data: publicData } = supabase.storage
        .from(NEWS_IMAGES_BUCKET)
        .getPublicUrl(storagePath);
      const url = publicData.publicUrl?.trim();
      if (!url) continue;

      const { data: existing } = await supabase
        .from("media_library")
        .select("id")
        .eq("url", url)
        .maybeSingle();

      if (!existing) {
        scheduleMediaLibraryTagging({ url, storage_path: storagePath });
      }
    }
  }
}

export async function listMediaLibrary(
  searchQuery = "",
): Promise<{ ok: true; items: MediaLibraryItem[] } | { ok: false; error: string }> {
  try {
    if (!searchQuery.trim()) {
      void backfillStorageIntoDb();
    }

    const rows = await fetchMediaLibraryRows(searchQuery);
    const items = rows.map(rowToItem);

    return { ok: true, items };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Medya listesi alınamadı",
    };
  }
}

export async function searchMediaLibrary(
  query: string,
): Promise<{ ok: true; items: MediaLibraryItem[] } | { ok: false; error: string }> {
  return listMediaLibrary(query);
}

/** AI etiketleme poll — yalnızca verilen URL'ler (hafif). */
export async function refreshMediaLibraryTaggingStatus(
  urls: string[],
): Promise<{ ok: true; items: MediaLibraryItem[] } | { ok: false; error: string }> {
  try {
    const rows = await fetchMediaLibraryRowsByUrls(urls);
    return { ok: true, items: rows.map(rowToItem) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Durum alınamadı",
    };
  }
}

export async function removeMediaLibraryItem(
  publicUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await deleteNewsImage(publicUrl);
  if (result.ok) {
    await deleteMediaLibraryByUrl(publicUrl);
    revalidatePath("/admin/fotograflar");
  }
  return result;
}

export async function uploadMediaLibraryFile(
  formData: FormData,
): Promise<
  | { ok: true; url: string; path: string; item: MediaLibraryItem }
  | { ok: false; error: string }
> {
  const folder = normalizeNewsImageFolder(
    typeof formData.get("folder") === "string" ? String(formData.get("folder")) : "covers",
  );
  formData.set("folder", folder);

  const result = await uploadNewsImage(formData);
  if (!result.ok) {
    return result;
  }

  scheduleMediaLibraryTagging({ url: result.url, storage_path: result.path });

  revalidatePath("/admin/fotograflar");

  const item: MediaLibraryItem = {
    id: "",
    path: result.path,
    url: result.url,
    name: result.path.split("/").pop() ?? result.path,
    folder,
    createdAt: new Date().toISOString(),
    altText: "",
    tags: [],
    taggingPending: true,
  };

  return {
    ok: true,
    url: result.url,
    path: result.path,
    item,
  };
}
