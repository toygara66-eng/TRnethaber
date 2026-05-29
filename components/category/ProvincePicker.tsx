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

/** Mega menü panel genişliği (Tailwind w-72) */
const PANEL_WIDTH_PX = 288;
const PANEL_MAX_HEIGHT = "min(32rem, calc(100vh - 5rem))";

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

function computePanelLeft(triggerLeft: number): number {
  if (typeof window === "undefined") return triggerLeft;
  const margin = 12;
  const maxLeft = window.innerWidth - PANEL_WIDTH_PX - margin;
  return Math.max(margin, Math.min(triggerLeft, maxLeft));
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
      top: r.bottom + 8,
      left: computePanelLeft(r.left),
      width: PANEL_WIDTH_PX,
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
    ? "inline-flex min-w-[4.5rem] items-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
    : "inline-flex items-center gap-1.5 rounded-full border border-trnet-primary/25 bg-trnet-card px-4 py-2.5 text-sm font-semibold text-trnet-primary shadow-sm transition hover:border-trnet-primary/50 hover:bg-trnet-primary/5";

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
          className={`h-4 w-4 shrink-0 opacity-80 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && mounted && anchor
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] bg-black/25"
              role="presentation"
              onClick={close}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="fixed flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
                style={{
                  top: anchor.top,
                  left: anchor.left,
                  width: anchor.width,
                  maxHeight: PANEL_MAX_HEIGHT,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] bg-trnet-surface/60 px-4 py-3">
                  <span
                    id={titleId}
                    className="font-display text-base font-semibold text-trnet-text"
                  >
                    {triggerLabel} — 81 il
                  </span>
                  <button
                    type="button"
                    onClick={close}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-trnet-text/50 transition hover:bg-black/5 hover:text-trnet-text"
                    aria-label="Kapat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <label className="relative shrink-0 border-b border-black/[0.06] px-4 py-3">
                  <span className="sr-only">İl ara</span>
                  <Search
                    className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-trnet-text/40"
                    aria-hidden
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="İl ara…"
                    className="w-full rounded-lg border border-black/[0.08] bg-white py-2.5 pl-10 pr-3 text-base text-trnet-text outline-none placeholder:text-trnet-text/45 focus:border-trnet-primary/50 focus:ring-2 focus:ring-trnet-primary/15"
                    autoComplete="off"
                  />
                </label>

                <div
                  id={listId}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth px-2 py-2 [scrollbar-color:rgba(0,0,0,0.2)_transparent] [scrollbar-width:thin]"
                  role="listbox"
                  aria-label="İl listesi"
                >
                  {filtered.length > 0 ? (
                    <ul className="flex flex-col gap-0.5">
                      {filtered.map((il) => (
                        <li key={il.slug}>
                          <Link
                            href={`/kategori/${il.slug}`}
                            role="option"
                            aria-selected={false}
                            onClick={() => {
                              close();
                              onNavigate?.();
                            }}
                            className="block rounded-lg px-4 py-3 text-base font-medium leading-snug text-trnet-text transition hover:bg-trnet-primary/8 hover:text-trnet-primary active:bg-trnet-primary/12"
                          >
                            {il.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-8 text-center text-base text-trnet-text/50">
                      Sonuç bulunamadı
                    </p>
                  )}
                </div>

                <div className="shrink-0 border-t border-black/[0.06] bg-trnet-surface/40 px-4 py-3">
                  <Link
                    href={hubHref}
                    onClick={() => {
                      close();
                      onNavigate?.();
                    }}
                    className="block rounded-lg py-2.5 text-center text-base font-semibold text-trnet-primary transition hover:bg-trnet-primary/8"
                  >
                    Tüm yerel haberler
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
