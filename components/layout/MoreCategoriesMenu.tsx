"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { categoryHref, NAV_BAR_MORE_ITEMS } from "@/lib/data/nav-categories";

type Props = {
  onNavigate?: () => void;
};

export function MoreCategoriesMenu({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className={`relative shrink-0 ${open ? "z-50" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white aria-expanded:bg-white/5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <Menu className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden xl:inline">Daha Fazla</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[13.5rem] overflow-hidden rounded-xl border border-white/10 bg-black/85 py-2 shadow-[0_24px_56px_rgba(0,0,0,0.72)] backdrop-blur-xl"
        >
          <p className="px-3.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Diğer kategoriler
          </p>
          <ul className="max-h-[min(20rem,calc(100vh-8rem))] overflow-y-auto overscroll-contain px-1 [scrollbar-width:thin]">
            {NAV_BAR_MORE_ITEMS.map((item) => (
              <li key={item.slug} role="none">
                <Link
                  href={categoryHref(item.slug)}
                  role="menuitem"
                  onClick={() => {
                    close();
                    onNavigate?.();
                  }}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-100 transition-colors duration-200 hover:bg-red-600/90 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
