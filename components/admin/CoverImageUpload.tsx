"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Images, Loader2, Trash2 } from "lucide-react";
import { MediaPickerModal } from "@/components/admin/MediaPickerModal";
import { useMediaTaggingPoll } from "@/hooks/useMediaTaggingPoll";
import { mergeMediaLibraryItems } from "@/lib/media/merge-media-library-items";
import { listMediaLibrary, type MediaLibraryItem } from "@/lib/actions/media-library";
import { deleteNewsImage } from "@/lib/actions/upload-cover-image";

type Props = {
  name?: string;
  initialUrl?: string;
  onUploadingChange?: (uploading: boolean) => void;
};

/** Haber kapak görseli — medya seçici modal */
export function CoverImageUpload({
  name = "kapak_gorseli",
  initialUrl = "",
  onUploadingChange,
}: Props) {
  const [url, setUrl] = useState(initialUrl.trim());
  const [modalOpen, setModalOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<MediaLibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    const result = await listMediaLibrary();
    setLibraryLoading(false);
    if (result.ok) {
      setLibraryItems(
        result.items.filter((i) => i.folder === "covers" || i.folder === "inline"),
      );
    }
  }, []);

  const applyTaggingUpdates = useCallback((updates: MediaLibraryItem[]) => {
    setLibraryItems((prev) => mergeMediaLibraryItems(prev, updates));
  }, []);

  useMediaTaggingPoll(libraryItems, applyTaggingUpdates, { enabled: modalOpen });

  const openModal = useCallback(() => {
    setModalOpen(true);
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    setUrl(initialUrl.trim());
  }, [initialUrl]);

  const handleRemove = useCallback(async () => {
    if (removing) return;
    const previous = url;
    setUrl("");
    if (previous) {
      setRemoving(true);
      await deleteNewsImage(previous);
      setRemoving(false);
    }
  }, [removing, url]);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={url} readOnly />

      {url ? (
        <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
          <div className="relative aspect-[16/10] w-full bg-trnet-surface">
            <Image
              src={url}
              alt="Kapak önizleme"
              fill
              unoptimized
              sizes="400px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.06] px-3 py-2.5">
            <p className="min-w-0 flex-1 truncate text-[10px] text-trnet-text/45" title={url}>
              Kapak atanmış
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={openModal}
                className="rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-semibold text-trnet-text transition hover:border-trnet-primary/40 hover:text-trnet-primary"
              >
                Değiştir
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={() => void handleRemove()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-trnet-breaking transition hover:bg-trnet-breaking/10 disabled:opacity-50"
              >
                {removing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                )}
                Kaldır
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={openModal}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/12 bg-trnet-surface/40 px-4 py-4 text-sm font-semibold text-trnet-text transition hover:border-trnet-primary/45 hover:bg-white hover:text-trnet-primary sm:w-auto sm:px-6"
      >
        {libraryLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Images className="h-4 w-4 text-trnet-primary" aria-hidden />
        )}
        {url ? "Kapak görselini değiştir" : "Kapak görseli seç"}
      </button>

      <p className="text-xs text-trnet-text/45">
        Kütüphaneden seçin veya yeni görsel yükleyin (covers klasörü).
      </p>

      <MediaPickerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={setUrl}
        folder="covers"
        title="Kapak görseli"
        libraryItems={libraryItems}
        onLibraryRefresh={loadLibrary}
        onUploadingChange={onUploadingChange}
      />
    </div>
  );
}
