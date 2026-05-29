"use client";

import { useCallback, useEffect, useState } from "react";
import { Images, Upload, X } from "lucide-react";
import { MediaLibraryGrid } from "@/components/admin/MediaLibraryGrid";
import { MediaUploadPanel } from "@/components/admin/MediaUploadPanel";
import type { MediaLibraryItem } from "@/lib/actions/media-library";
import type { NewsImageFolder } from "@/lib/storage/news-images";

type TabId = "upload" | "library";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  folder?: NewsImageFolder;
  title?: string;
  libraryItems: MediaLibraryItem[];
  onLibraryRefresh?: () => void;
  onUploadingChange?: (uploading: boolean) => void;
};

export function MediaPickerModal({
  open,
  onClose,
  onSelect,
  folder = "covers",
  title = "Kapak görseli",
  libraryItems,
  onLibraryRefresh,
  onUploadingChange,
}: Props) {
  const [tab, setTab] = useState<TabId>("library");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const handleSelect = useCallback(
    (item: MediaLibraryItem) => {
      onSelect(item.url);
      onClose();
    },
    [onClose, onSelect],
  );

  const handleUploaded = useCallback(
    (item: MediaLibraryItem) => {
      onLibraryRefresh?.();
      onSelect(item.url);
      onClose();
    },
    [onClose, onLibraryRefresh, onSelect],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-picker-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Kapat"
        onClick={onClose}
      />

      <div className="relative flex max-h-[min(90vh,820px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-trnet-card shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-black/[0.06] px-5 py-4 sm:px-6">
          <div>
            <p
              id="media-picker-title"
              className="flex items-center gap-2 font-display text-xl font-semibold text-trnet-text"
            >
              <Images className="h-5 w-5 text-trnet-primary" aria-hidden />
              {title}
            </p>
            <p className="mt-1 text-xs text-trnet-text/50">
              Yükleyin veya kütüphaneden seçin — seçim otomatik kaydedilir.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-trnet-text/50 transition hover:bg-trnet-surface hover:text-trnet-text"
            aria-label="Modalı kapat"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="flex shrink-0 gap-1 border-b border-black/[0.06] px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === "upload"
                ? "border-trnet-primary text-trnet-primary"
                : "border-transparent text-trnet-text/50 hover:text-trnet-text"
            }`}
          >
            <Upload className="h-4 w-4" aria-hidden />
            Yükle
          </button>
          <button
            type="button"
            onClick={() => setTab("library")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === "library"
                ? "border-trnet-primary text-trnet-primary"
                : "border-transparent text-trnet-text/50 hover:text-trnet-text"
            }`}
          >
            <Images className="h-4 w-4" aria-hidden />
            Kütüphane
            <span className="rounded-full bg-trnet-surface px-2 py-0.5 text-[10px] tabular-nums text-trnet-text/60">
              {libraryItems.length}
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {tab === "upload" ? (
            <MediaUploadPanel
              folder={folder}
              compact
              onUploadingChange={onUploadingChange}
              onUploaded={handleUploaded}
            />
          ) : (
            <MediaLibraryGrid
              initialItems={libraryItems}
              selectionMode
              selectedUrl={selectedUrl ?? undefined}
              onSelect={(item) => {
                setSelectedUrl(item.url);
                handleSelect(item);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
