"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { categoryHref, MORE_NAV_ITEMS } from "@/lib/data/nav-categories";

type AnchorRect = {
  top: number;
  left: number;
  width: number;
};

type Props = {
  onNavigate?: () => void;
};

export function MoreCategoriesMenu({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  const measureAnchor = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({
      top: r.bottom + 6,
      left: r.right - 160,
      width: 160,
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setAnchor(null);
  }, []);

  const openPanel = useCallback(() => {
    measureAnchor();
    setOpen(true);
  }, [measureAnchor]);

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

    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open, close, measureAnchor]);

  return (
    <div className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : openPanel())}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-trnet-primary hover:bg-trnet-primary/20 hover:text-white"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Diğer kategoriler"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
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
                className="fixed flex max-h-[min(16rem,calc(100vh-6rem))] flex-col overflow-hidden rounded-lg border border-black/10 bg-white/80 shadow-lg"
                style={{
                  top: anchor.top,
                  left: Math.max(8, anchor.left),
                  width: anchor.width,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] px-2.5 py-2">
                  <span id={titleId} className="text-sm font-medium text-trnet-text">
                    Diğer kategoriler
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

                <ul className="overflow-y-auto overscroll-contain px-1.5 py-1 [scrollbar-width:thin]">
                  {MORE_NAV_ITEMS.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={categoryHref(item.slug)}
                        onClick={() => {
                          close();
                          onNavigate?.();
                        }}
                        className="block rounded-md px-2.5 py-2 text-sm font-medium text-trnet-text transition hover:bg-white hover:text-trnet-primary"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
