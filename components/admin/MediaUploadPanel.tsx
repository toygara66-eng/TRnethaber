"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { uploadMediaLibraryFile } from "@/lib/actions/media-library";
import type { MediaLibraryItem } from "@/lib/actions/media-library";
import type { NewsImageFolder } from "@/lib/storage/news-images";

const ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

type Props = {
  folder?: NewsImageFolder;
  onUploaded?: (item: MediaLibraryItem) => void;
  onUploadingChange?: (uploading: boolean) => void;
  compact?: boolean;
};

export function MediaUploadPanel({
  folder = "covers",
  onUploaded,
  onUploadingChange,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setBusy = useCallback(
    (busy: boolean) => {
      setUploading(busy);
      onUploadingChange?.(busy);
    },
    [onUploadingChange],
  );

  const runUpload = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      setProgress(10);

      const tick = window.setInterval(() => {
        setProgress((p) => (p >= 92 ? p : p + 8));
      }, 100);

      try {
        const body = new FormData();
        body.set("file", file);
        body.set("folder", folder);
        const result = await uploadMediaLibraryFile(body);
        clearInterval(tick);

        if (!result.ok) {
          setError(result.error);
          setProgress(0);
          return;
        }

        setProgress(100);
        onUploaded?.(result.item);
      } catch {
        clearInterval(tick);
        setError("Yükleme sırasında beklenmeyen bir hata oluştu.");
        setProgress(0);
      } finally {
        setBusy(false);
        window.setTimeout(() => setProgress(0), 400);
      }
    },
    [folder, onUploaded, setBusy],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file || uploading) return;
      void runUpload(file);
    },
    [runUpload, uploading],
  );

  const openPicker = () => {
    if (!uploading) inputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={uploading}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onClick={openPicker}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!uploading) handleFiles(e.dataTransfer.files);
        }}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition ${
          compact ? "px-4 py-6" : "px-6 py-10"
        } ${
          uploading
            ? "pointer-events-none border-trnet-primary/30 bg-trnet-primary/5"
            : dragOver
              ? "border-trnet-primary bg-trnet-primary/5"
              : "border-black/12 bg-trnet-surface/50 hover:border-trnet-primary/45 hover:bg-white"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-trnet-primary" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-trnet-text">Yükleniyor…</p>
            <div className="mt-3 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-trnet-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/[0.06]">
              <ImagePlus className="h-5 w-5 text-trnet-primary" aria-hidden />
            </div>
            <p className="mt-3 text-sm font-semibold text-trnet-text">
              Sürükle bırak veya dosya seç
            </p>
            <p className="mt-1 text-xs text-trnet-text/45">
              JPG, PNG, WebP · {folder}/ klasörü
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-trnet-primary px-4 py-2 text-xs font-semibold text-white">
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Yükle
            </span>
          </>
        )}
      </div>

      {error ? (
        <p className="text-xs font-medium text-trnet-breaking" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
