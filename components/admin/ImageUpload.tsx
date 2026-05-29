"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import {
  deleteNewsImage,
  uploadNewsImage,
} from "@/lib/actions/upload-cover-image";
import type { NewsImageFolder } from "@/lib/storage/news-images";

const ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export type ImageUploadAspect = "16/10" | "square" | "banner" | "auto";

const ASPECT_CLASS: Record<ImageUploadAspect, string> = {
  "16/10": "aspect-[16/10]",
  square: "aspect-square max-w-[200px]",
  banner: "aspect-[5/1] max-h-28",
  auto: "aspect-auto min-h-[120px]",
};

type Props = {
  name: string;
  initialUrl?: string;
  folder?: NewsImageFolder;
  label?: string;
  hint?: string;
  aspectRatio?: ImageUploadAspect;
  onUploadingChange?: (uploading: boolean) => void;
};

export function ImageUpload({
  name,
  initialUrl = "",
  folder = "covers",
  label,
  hint,
  aspectRatio = "16/10",
  onUploadingChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl.trim());
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
      setProgress(8);

      const tick = window.setInterval(() => {
        setProgress((p) => (p >= 92 ? p : p + 6));
      }, 120);

      try {
        const body = new FormData();
        body.set("file", file);
        body.set("folder", folder);
        const result = await uploadNewsImage(body);
        clearInterval(tick);

        if (!result.ok) {
          setError(result.error);
          setProgress(0);
          return;
        }

        setProgress(100);
        setUrl(result.url);
      } catch {
        clearInterval(tick);
        setError("Yükleme sırasında beklenmeyen bir hata oluştu.");
        setProgress(0);
      } finally {
        setBusy(false);
        window.setTimeout(() => setProgress(0), 400);
      }
    },
    [folder, setBusy],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file || uploading) return;
      void runUpload(file);
    },
    [runUpload, uploading],
  );

  const handleRemove = useCallback(async () => {
    if (uploading) return;
    const previous = url;
    setUrl("");
    setError(null);
    if (previous) {
      await deleteNewsImage(previous);
    }
  }, [url, uploading]);

  const openPicker = () => {
    if (!uploading) inputRef.current?.click();
  };

  const previewAspect = ASPECT_CLASS[aspectRatio];

  return (
    <div className="space-y-3">
      {label ? (
        <p className="text-sm font-semibold text-trnet-text">{label}</p>
      ) : null}
      {hint ? <p className="text-xs text-trnet-text/50">{hint}</p> : null}

      <input type="hidden" name={name} value={url} readOnly />

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
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
          uploading
            ? "pointer-events-none border-trnet-primary/30 bg-trnet-primary/5"
            : dragOver
              ? "border-trnet-primary bg-trnet-primary/5"
              : "border-black/12 bg-trnet-surface/40 hover:border-trnet-primary/50 hover:bg-trnet-surface/80"
        }`}
        aria-disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="h-9 w-9 animate-spin text-trnet-primary" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-trnet-text">Yükleniyor…</p>
            <div className="mt-3 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-trnet-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs tabular-nums text-trnet-text/50">{progress}%</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/[0.06]">
              <ImagePlus className="h-6 w-6 text-trnet-primary" aria-hidden />
            </div>
            <p className="mt-3 text-sm font-semibold text-trnet-text">
              Sürükle bırak veya tıkla
            </p>
            <p className="mt-1 text-xs text-trnet-text/45">JPG, PNG, WebP · en fazla 8 MB</p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-trnet-primary px-4 py-2 text-xs font-semibold text-white shadow-sm">
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Dosya seç
            </span>
          </>
        )}
      </div>

      {error ? (
        <p className="text-xs font-medium text-trnet-breaking" role="alert">
          {error}
        </p>
      ) : null}

      {url && !uploading ? (
        <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white">
          {aspectRatio === "auto" ? (
            <div className="flex min-h-[120px] items-center justify-center bg-trnet-surface p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Görsel önizleme" className="max-h-48 w-full object-contain" />
            </div>
          ) : (
            <div className={`relative w-full bg-trnet-surface ${previewAspect}`}>
              <Image
                src={url}
                alt="Görsel önizleme"
                fill
                unoptimized
                sizes="400px"
                className="object-cover"
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-black/[0.06] px-3 py-2">
            <p className="truncate text-[10px] text-trnet-text/45" title={url}>
              Yüklendi
            </p>
            <button
              type="button"
              onClick={() => void handleRemove()}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-trnet-breaking transition hover:bg-trnet-breaking/10"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Kaldır
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
