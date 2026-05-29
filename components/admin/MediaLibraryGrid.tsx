"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Copy, Loader2, Trash2 } from "lucide-react";
import {
  listMediaLibrary,
  removeMediaLibraryItem,
  type MediaLibraryItem,
} from "@/lib/actions/media-library";

type Props = {
  initialItems: MediaLibraryItem[];
  /** Seçim modu — tıklanınca onSelect çağrılır */
  selectionMode?: boolean;
  onSelect?: (item: MediaLibraryItem) => void;
  selectedUrl?: string;
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function MediaLibraryGrid({
  initialItems,
  selectionMode = false,
  onSelect,
  selectedUrl,
}: Props) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);
  const [loading, setLoading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listMediaLibrary();
    setLoading(false);
    if (result.ok) {
      setItems(result.items);
    } else {
      setError(result.error);
    }
  }, []);

  const handleCopy = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl((c) => (c === url ? null : c)), 2000);
    } catch {
      setError("URL panoya kopyalanamadı");
    }
  }, []);

  const handleDelete = useCallback(
    async (item: MediaLibraryItem) => {
      if (!window.confirm(`"${item.name}" silinsin mi? Bu işlem geri alınamaz.`)) {
        return;
      }
      setDeletingPath(item.path);
      setError(null);
      const result = await removeMediaLibraryItem(item.url);
      setDeletingPath(null);
      if (!result.ok) {
        setError(result.error ?? "Silinemedi");
        return;
      }
      setItems((prev) => prev.filter((i) => i.path !== item.path));
    },
    [],
  );

  const empty = items.length === 0;

  const gridClass = useMemo(
    () =>
      selectionMode
        ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
        : "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    [selectionMode],
  );

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-trnet-text/50">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-trnet-breaking/25 bg-trnet-breaking/10 px-4 py-2 text-sm text-trnet-breaking">
          {error}
        </p>
      ) : null}

      {empty ? (
        <div className="rounded-xl border border-dashed border-black/12 bg-trnet-surface/60 px-6 py-14 text-center">
          <p className="text-sm font-medium text-trnet-text">Henüz görsel yok</p>
          <p className="mt-1 text-xs text-trnet-text/50">
            Yükle sekmesinden veya üstteki butondan ilk görseli ekleyin.
          </p>
        </div>
      ) : (
        <div className={gridClass}>
          {items.map((item) => {
            const isSelected = selectedUrl === item.url;
            const isDeleting = deletingPath === item.path;

            return (
              <article
                key={item.path}
                className={`group overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                  isSelected
                    ? "border-trnet-primary ring-2 ring-trnet-primary/30"
                    : "border-black/[0.08] hover:border-trnet-primary/35 hover:shadow-md"
                }`}
              >
                <button
                  type="button"
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-trnet-surface"
                  onClick={() => {
                    if (selectionMode) onSelect?.(item);
                  }}
                  disabled={!selectionMode}
                >
                  <Image
                    src={item.url}
                    alt={item.name}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 50vw, 240px"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  {isSelected ? (
                    <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-trnet-primary text-white shadow">
                      <Check className="h-4 w-4" aria-hidden />
                    </span>
                  ) : null}
                  <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 text-left text-[10px] font-medium uppercase tracking-wide text-white/90">
                    {item.folder}
                  </span>
                </button>

                <div className="space-y-2 p-2.5">
                  {item.taggingPending ? (
                    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                      AI etiketleniyor…
                    </span>
                  ) : item.altText ? (
                    <p
                      className="line-clamp-2 text-[11px] leading-snug text-trnet-text"
                      title={item.altText}
                    >
                      {item.altText}
                    </p>
                  ) : null}
                  {item.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-trnet-surface px-1.5 py-0.5 text-[10px] font-medium text-trnet-text/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="truncate text-[10px] text-trnet-text/45" title={item.name}>
                    {formatDate(item.createdAt)}
                  </p>

                  {!selectionMode ? (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleCopy(item.url)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-black/[0.08] bg-trnet-surface/80 px-2 py-1.5 text-[11px] font-semibold text-trnet-text transition hover:border-trnet-primary/30 hover:text-trnet-primary"
                      >
                        <Copy className="h-3 w-3" aria-hidden />
                        {copiedUrl === item.url ? "Kopyalandı" : "URL Kopyala"}
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void handleDelete(item)}
                        className="inline-flex items-center justify-center rounded-lg border border-trnet-breaking/20 px-2 py-1.5 text-trnet-breaking transition hover:bg-trnet-breaking/10 disabled:opacity-50"
                        aria-label="Sil"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect?.(item)}
                      className="w-full rounded-lg bg-trnet-primary px-2 py-1.5 text-[11px] font-semibold text-white transition hover:bg-trnet-breaking"
                    >
                      Seç
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!selectionMode ? (
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="text-xs font-semibold text-trnet-primary hover:underline disabled:opacity-50"
        >
          {loading ? "Yenileniyor…" : "Listeyi yenile"}
        </button>
      ) : null}
    </div>
  );
}
