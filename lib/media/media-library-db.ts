import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NEWS_IMAGES_BUCKET, newsImagePathFromPublicUrl } from "@/lib/storage/news-images";
import type { NewsImageFolder } from "@/lib/storage/news-images";

export type MediaLibraryRow = {
  id: string;
  url: string;
  storage_path: string | null;
  tags: string[];
  alt_text: string;
  created_at: string;
};

export function folderFromStoragePath(path: string | null): NewsImageFolder {
  const prefix = path?.split("/")[0]?.toLowerCase();
  if (prefix === "covers" || prefix === "inline" || prefix === "entities" || prefix === "site") {
    return prefix;
  }
  return "covers";
}

export async function upsertMediaLibraryStub(input: {
  url: string;
  storage_path?: string | null;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const path = input.storage_path ?? newsImagePathFromPublicUrl(input.url);

  const { error } = await supabase.from("media_library").upsert(
    {
      url: input.url.trim(),
      storage_path: path,
      alt_text: "",
      tags: [],
    },
    { onConflict: "url" },
  );

  if (error) {
    console.warn("[media_library] stub upsert:", error.message);
  }
}

export async function updateMediaLibraryMetadata(
  url: string,
  meta: { alt_text: string; tags: string[] },
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("media_library")
    .update({
      alt_text: meta.alt_text,
      tags: meta.tags,
    })
    .eq("url", url.trim());

  if (error) {
    console.warn("[media_library] metadata update:", error.message);
  }
}

export async function deleteMediaLibraryByUrl(url: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from("media_library").delete().eq("url", url.trim());
}

export async function fetchMediaLibraryRowsByUrls(urls: string[]): Promise<MediaLibraryRow[]> {
  const unique = Array.from(new Set(urls.map((u) => u.trim()).filter(Boolean))).slice(0, 50);
  if (unique.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("media_library")
    .select("id, url, storage_path, tags, alt_text, created_at")
    .in("url", unique);

  if (error) {
    console.warn("[media_library] fetch by urls:", error.message);
    return [];
  }

  return (data ?? []) as MediaLibraryRow[];
}

export async function fetchMediaLibraryRows(searchQuery = ""): Promise<MediaLibraryRow[]> {
  const supabase = createSupabaseAdminClient();
  const q = searchQuery.trim();

  if (q) {
    const { data, error } = await supabase.rpc("search_media_library", {
      search_query: q,
    });

    if (error) {
      console.warn("[media_library] search rpc:", error.message);
      return fetchMediaLibraryRowsFallback(q);
    }

    return (data ?? []) as MediaLibraryRow[];
  }

  const { data, error } = await supabase
    .from("media_library")
    .select("id, url, storage_path, tags, alt_text, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.warn("[media_library] list:", error.message);
    return [];
  }

  return (data ?? []) as MediaLibraryRow[];
}

async function fetchMediaLibraryRowsFallback(searchQuery: string): Promise<MediaLibraryRow[]> {
  const supabase = createSupabaseAdminClient();
  const pattern = `%${searchQuery.replace(/[%_]/g, "")}%`;

  const { data, error } = await supabase
    .from("media_library")
    .select("id, url, storage_path, tags, alt_text, created_at")
    .or(`alt_text.ilike.${pattern},url.ilike.${pattern}`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return [];
  const rows = (data ?? []) as MediaLibraryRow[];
  const lower = searchQuery.toLowerCase();
  return rows.filter(
    (r) =>
      r.alt_text.toLowerCase().includes(lower) ||
      r.url.toLowerCase().includes(lower) ||
      r.tags.some((t) => t.toLowerCase().includes(lower)),
  );
}
