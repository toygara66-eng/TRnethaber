"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { ProvincePicker } from "@/components/category/ProvincePicker";
import { MoreCategoriesMenu } from "@/components/layout/MoreCategoriesMenu";
import { categoryHref, MORE_NAV_ITEMS, PRIMARY_NAV_ITEMS } from "@/lib/data/nav-categories";

export function SiteHeader() {
  const [shrunk, setShrunk] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setShrunk(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header
      className={`sticky top-0 z-40 border-b border-white/10 bg-trnet-black/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[height] duration-300 ease-out ${
        shrunk ? "h-[4.5rem]" : "h-[5.25rem]"
      }`}
    >
      <div className="mx-auto grid h-full w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group relative z-50 flex shrink-0 flex-col leading-none text-white"
          aria-label="TRNETHABER anasayfa"
        >
          <span
            className={`whitespace-nowrap font-display tracking-[0.08em] transition-all duration-300 ${
              shrunk ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
            }`}
          >
            <span className="text-white">TRNET</span>
            <span className="text-trnet-primary transition-colors group-hover:text-white">
              HABER
            </span>
          </span>
          <span
            className={`-mt-0.5 block w-full text-[11px] font-medium leading-none tracking-[0.04em] text-white/55 transition-opacity duration-300 sm:text-xs ${
              shrunk ? "hidden" : "hidden sm:block"
            }`}
          >
            Türkiye&apos;nin Net Haber Ağı
          </span>
        </Link>

        <nav
          className="hidden min-w-0 items-center justify-center gap-0.5 overflow-x-auto lg:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Ana menü"
        >
          {PRIMARY_NAV_ITEMS.slice(0, 3).map((item) => (
            <Link
              key={item.slug}
              href={categoryHref(item.slug)}
              className="shrink-0 rounded-md px-2.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <ProvincePicker variant="dark" triggerLabel="Yerel" onNavigate={closeMobile} />
          {PRIMARY_NAV_ITEMS.slice(3).map((item) => (
            <Link
              key={item.slug}
              href={categoryHref(item.slug)}
              className="shrink-0 rounded-md px-2.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-trnet-primary hover:bg-trnet-primary/20 hover:text-white"
            aria-label="Arama"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
          <div className="hidden lg:block">
            <MoreCategoriesMenu onNavigate={closeMobile} />
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white lg:hidden"
            aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 bg-trnet-black lg:hidden">
          <div className="mx-auto max-h-[75vh] max-w-7xl space-y-1 overflow-y-auto px-4 py-4">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <Link
                key={item.slug}
                href={categoryHref(item.slug)}
                className="block rounded-xl bg-white/5 px-4 py-3 text-base font-semibold text-white"
                onClick={closeMobile}
              >
                {item.label}
              </Link>
            ))}
            <div className="rounded-xl bg-white/5 px-4 py-3">
              <ProvincePicker variant="dark" triggerLabel="Yerel" onNavigate={closeMobile} />
            </div>
            <p className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-white/40">
              Diğer kategoriler
            </p>
            {MORE_NAV_ITEMS.map((item) => (
              <Link
                key={item.slug}
                href={categoryHref(item.slug)}
                className="block rounded-xl bg-white/5 px-4 py-3 text-base text-white/90"
                onClick={closeMobile}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
