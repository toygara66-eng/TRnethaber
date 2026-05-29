"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import { MediaLibraryGrid } from "@/components/admin/MediaLibraryGrid";
import { MediaUploadPanel } from "@/components/admin/MediaUploadPanel";
import { useMediaTaggingPoll } from "@/hooks/useMediaTaggingPoll";
import { mergeMediaLibraryItems } from "@/lib/media/merge-media-library-items";
import { listMediaLibrary, type MediaLibraryItem } from "@/lib/actions/media-library";

type Props = {
  initialItems: MediaLibraryItem[];
};

export function MediaLibraryPageClient({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [showUpload, setShowUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const skipInitialSearchRef = useRef(true);

  const runSearch = useCallback(async (query: string) => {
    setSearching(true);
    const result = await listMediaLibrary(query);
    setSearching(false);
    if (result.ok) setItems(result.items);
  }, []);

  useEffect(() => {
    if (skipInitialSearchRef.current) {
      skipInitialSearchRef.current = false;
      if (!searchInput.trim()) return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(searchInput);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [searchInput, runSearch]);

  const applyTaggingUpdates = useCallback((updates: MediaLibraryItem[]) => {
    setItems((prev) => mergeMediaLibraryItems(prev, updates));
  }, []);

  useMediaTaggingPoll(items, applyTaggingUpdates);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await runSearch(searchInput);
    setRefreshing(false);
  }, [runSearch, searchInput]);

  const handleUploaded = useCallback((item: MediaLibraryItem) => {
    setItems((prev) => {
      const next = [item, ...prev.filter((i) => i.url !== item.url)];
      return next.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
    setShowUpload(false);
  }, []);

  const pendingCount = items.filter((i) => i.taggingPending).length;

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-trnet-text/40"
          aria-hidden
        />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Alt metin veya etiketlerde ara… (ör. ekonomi, istanbul, seçim)"
          className="admin-input w-full py-3 pl-11 pr-11"
          aria-label="Medya kütüphanesinde ara"
        />
        {searchInput ? (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-trnet-text/45 hover:bg-trnet-surface"
            aria-label="Aramayı temizle"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowUpload((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-trnet-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-trnet-primary/20 transition hover:bg-trnet-breaking"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Yeni Yükle
        </button>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing || searching}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-trnet-text transition hover:border-trnet-primary/30 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing || searching ? "animate-spin" : ""}`}
            aria-hidden
          />
          Yenile
        </button>
        <p className="text-sm text-trnet-text/50">
          <span className="font-semibold tabular-nums text-trnet-text">{items.length}</span>{" "}
          sonuç
          {searching ? " · aranıyor…" : null}
          {pendingCount > 0 ? (
            <span className="text-amber-800">
              {" "}
              · {pendingCount} görsel AI ile etiketleniyor…
            </span>
          ) : null}
        </p>
      </div>

      {showUpload ? (
        <div className="admin-card rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-trnet-text">Yeni görsel yükle</h2>
          <p className="mb-3 text-xs text-trnet-text/50">
            Yükleme anında kayıt oluşturulur; Gemini Vision etiketlemesi arka planda tamamlanır
            (sayfa otomatik güncellenir).
          </p>
          <MediaUploadPanel folder="covers" onUploaded={handleUploaded} />
        </div>
      ) : null}

      <MediaLibraryGrid initialItems={items} />
    </div>
  );
}
