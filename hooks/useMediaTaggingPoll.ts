"use client";

import { useEffect, useRef } from "react";
import {
  refreshMediaLibraryTaggingStatus,
  type MediaLibraryItem,
} from "@/lib/actions/media-library";
import { hasTaggingPending } from "@/lib/media/merge-media-library-items";

type Options = {
  /** false ise polling durur (ör. kapalı modal) */
  enabled?: boolean;
  intervalMs?: number;
  maxAttempts?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * AI etiketlemesi bekleyen görseller için hafif DB poll — tam liste çekmez.
 */
export function useMediaTaggingPoll(
  items: MediaLibraryItem[],
  onUpdates: (updates: MediaLibraryItem[]) => void,
  options: Options = {},
): void {
  const { enabled = true, intervalMs = 3000, maxAttempts = 45 } = options;
  const onUpdatesRef = useRef(onUpdates);
  onUpdatesRef.current = onUpdates;

  const pendingKey = items
    .filter((i) => i.taggingPending)
    .map((i) => i.url)
    .join("\0");

  useEffect(() => {
    const urls = pendingKey.split("\0").filter(Boolean);
    if (!enabled || urls.length === 0) return;

    let cancelled = false;

    const loop = async () => {
      let attempts = 0;
      while (!cancelled && attempts < maxAttempts) {
        const result = await refreshMediaLibraryTaggingStatus(urls);
        if (cancelled) return;

        if (result.ok) {
          onUpdatesRef.current(result.items);
          if (!result.items.some((i) => i.taggingPending)) return;
        }

        attempts += 1;
        if (attempts >= maxAttempts || cancelled) return;
        await sleep(intervalMs);
      }
    };

    void loop();
    return () => {
      cancelled = true;
    };
  }, [enabled, pendingKey, intervalMs, maxAttempts]);
}

export { hasTaggingPending };
