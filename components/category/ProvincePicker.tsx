"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";
import { TURKIYE_ILLER, YEREL_HABERLER_SLUG } from "@/lib/data/turkiye-iller";

export type ProvinceOption = {
  slug: string;
  name: string;
};

type Props = {
  provinces?: ProvinceOption[];
  variant?: "light" | "dark";
  triggerLabel?: string;
  onNavigate?: () => void;
};

type AnchorRect = {
  top: number;
  left: number;
  width: number;
};

const DEFAULT_PROVINCES = TURKIYE_ILLER.map((il) => ({
  slug: il.slug,
  name: il.name,
}));

function normalizeForSearch(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .trim();
}

export function ProvincePicker({
  provinces = DEFAULT_PROVINCES,
  variant = "light",
  triggerLabel = "Yerel Haberler",
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const listId = useId();

  useEffect(() => setMounted(true), []);

  const measureAnchor = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({
      top: r.bottom + 6,
      left: r.left,
      width: r.width,
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setAnchor(null);
  }, []);

  const openPanel = useCallback(() => {
    measureAnchor();
    setOpen(true);
  }, [measureAnchor]);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return provinces;
    return provinces.filter((il) => normalizeForSearch(il.name).includes(q));
  }, [provinces, query]);

  useEffect(() => {
    if (!open) return;
    measureAnchor();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onLayout = () => measureAnchor();

    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);

    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      window.clearTimeout(t);
    };
  }, [open, close, measureAnchor]);

  const isDark = variant === "dark";
  const hubHref = `/kategori/${YEREL_HABERLER_SLUG}`;

  const triggerClass = isDark
    ? "inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
    : "inline-flex items-center gap-1 rounded-full border border-trnet-primary/25 bg-trnet-card px-4 py-2 text-sm font-semibold text-trnet-primary shadow-sm transition hover:border-trnet-primary/50 hover:bg-trnet-primary/5";

  return (
    <div className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : openPanel())}
        className={triggerClass}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {triggerLabel}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-70 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && mounted && anchor
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] bg-black/20"
              role="presentation"
              onClick={close}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="fixed flex max-h-[min(20rem,calc(100vh-6rem))] flex-col overflow-hidden rounded-lg border border-black/10 bg-white/80 shadow-lg"
                style={{
                  top: anchor.top,
                  left: anchor.left,
                  width: anchor.width,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] px-2.5 py-2">
                  <span id={titleId} className="text-sm font-medium text-trnet-text">
                    {triggerLabel}
                  </span>
                  <button
                    type="button"
                    onClick={close}
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-trnet-text/50 hover:text-trnet-text"
                    aria-label="Kapat"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <label className="relative shrink-0 border-b border-black/[0.06] px-2 py-2">
                  <span className="sr-only">İl ara</span>
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-trnet-text/40"
                    aria-hidden
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="İl ara…"
                    className="w-full rounded-md border border-black/[0.08] bg-white/90 py-1.5 pl-8 pr-2 text-sm text-trnet-text outline-none placeholder:text-trnet-text/40 focus:border-trnet-primary/40"
                    autoComplete="off"
                  />
                </label>

                <div
                  id={listId}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth px-1.5 py-1 [scrollbar-width:thin]"
                  role="listbox"
                  aria-label="İl listesi"
                >
                  {filtered.length > 0 ? (
                    <ul className="flex flex-col">
                      {filtered.map((il) => (
                        <li key={il.slug} role="option">
                          <Link
                            href={`/kategori/${il.slug}`}
                            onClick={() => {
                              close();
                              onNavigate?.();
                            }}
                            className="block rounded-md px-2.5 py-2 text-sm font-medium text-trnet-text transition hover:bg-white hover:text-trnet-primary"
                          >
                            {il.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-2.5 py-4 text-center text-sm text-trnet-text/50">Sonuç yok</p>
                  )}
                </div>

                <div className="shrink-0 border-t border-black/[0.06] px-2 py-2">
                  <Link
                    href={hubHref}
                    onClick={() => {
                      close();
                      onNavigate?.();
                    }}
                    className="block rounded-md py-1.5 text-center text-sm font-medium text-trnet-primary hover:underline"
                  >
                    Tümü
                  </Link>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
