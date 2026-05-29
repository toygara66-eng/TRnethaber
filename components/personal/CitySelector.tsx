"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Search, Sparkles, X } from "lucide-react";
import { TURKIYE_ILLER } from "@/lib/data/turkiye-iller";
import { findIlByName, isValidCityName } from "@/lib/user-city";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (cityName: string) => void;
  initialCity?: string | null;
};

function normalizeForSearch(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

export function CitySelector({ open, onClose, onSelect, initialCity }: Props) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return TURKIYE_ILLER;
    return TURKIYE_ILLER.filter((il) => normalizeForSearch(il.name).includes(q));
  }, [query]);

  const handlePick = useCallback(
    (cityName: string) => {
      if (!isValidCityName(cityName)) return;
      onSelect(findIlByName(cityName)!.name);
      onClose();
    },
    [onClose, onSelect],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[3px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(32rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-black/[0.06] bg-gradient-to-r from-trnet-primary/8 to-transparent px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-trnet-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Sana özel
              </p>
              <h2 id={titleId} className="mt-1 font-display text-2xl font-semibold text-trnet-text">
                Şehrini seç
              </h2>
              <p className="mt-1.5 text-sm text-trnet-text/55">
                {initialCity
                  ? `Şu an: ${initialCity}. Başka bir il seçebilirsin.`
                  : "81 ilden birini seç; haber akışın kişiselleşsin."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-trnet-text/45 hover:bg-black/5 hover:text-trnet-text"
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <label className="relative border-b border-black/[0.06] px-5 py-3">
          <span className="sr-only">İl ara</span>
          <Search
            className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-trnet-text/40"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İl ara… (örn: Yozgat)"
            className="admin-input pl-10"
            autoComplete="off"
          />
        </label>

        <ul
          className="min-h-0 flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:thin]"
          role="listbox"
          aria-label="81 il"
        >
          {filtered.length > 0 ? (
            filtered.map((il) => (
              <li key={il.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={initialCity === il.name}
                  onClick={() => handlePick(il.name)}
                  className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-base font-medium text-trnet-text transition hover:bg-trnet-primary/8 hover:text-trnet-primary"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-trnet-primary/70" aria-hidden />
                  {il.name}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-10 text-center text-sm text-trnet-text/50">Sonuç bulunamadı</li>
          )}
        </ul>
      </div>
    </div>
  );
}
