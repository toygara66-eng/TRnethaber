import type { MediaLibraryItem } from "@/lib/actions/media-library";

/** URL eşleşen öğeleri günceller; listede olmayan patch'leri eklemez. */
export function mergeMediaLibraryItems(
  current: MediaLibraryItem[],
  updates: MediaLibraryItem[],
): MediaLibraryItem[] {
  if (updates.length === 0) return current;
  const byUrl = new Map(updates.map((u) => [u.url, u]));
  return current.map((item) => byUrl.get(item.url) ?? item);
}

export function hasTaggingPending(items: MediaLibraryItem[]): boolean {
  return items.some((i) => i.taggingPending);
}
