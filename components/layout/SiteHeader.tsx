"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { ProvincePicker } from "@/components/category/ProvincePicker";
import { useAuth } from "@/components/auth/AuthProvider";
import { SanaOzelNavLink } from "@/components/personal/SanaOzelNavLink";
import { MoreCategoriesMenu } from "@/components/layout/MoreCategoriesMenu";
import {
  categoryHref,
  GAMES_NAV_ITEM,
  MORE_NAV_ITEMS,
  PRIMARY_NAV_ITEMS,
} from "@/lib/data/nav-categories";

const MOBILE_SCROLL_LINK_CLASS =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white/90 transition hover:border-trnet-primary/40 hover:bg-trnet-primary/15 hover:text-white";

function HeaderAuthControls({ onNavigate }: { onNavigate?: () => void }) {
  const { user, ready, signOut } = useAuth();

  if (!ready) return null;

  if (user) {
    return (
      <button
        type="button"
        onClick={() => {
          void signOut();
          onNavigate?.();
        }}
        className="hidden rounded-md px-2.5 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/5 hover:text-white sm:block"
      >
        Çıkış
      </button>
    );
  }

  return (
    <Link
      href="/signup?redirect=/sana-ozel&reason=personalize"
      onClick={onNavigate}
      className="hidden rounded-md bg-trnet-primary/20 px-2.5 py-2 text-xs font-semibold text-trnet-primary transition hover:bg-trnet-primary/30 sm:block"
    >
      Üye Ol
    </Link>
  );
}

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
        shrunk ? "" : ""
      }`}
    >
      <div
        className={`mx-auto w-full max-w-7xl px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
          shrunk ? "py-2" : "py-2.5 sm:py-3"
        }`}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
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
            className="hidden min-w-0 items-center justify-center gap-0.5 overflow-x-auto whitespace-nowrap scrollbar-hide lg:flex"
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
            <SanaOzelNavLink onNavigate={closeMobile} />
            <Link
              href={GAMES_NAV_ITEM.href}
              className="shrink-0 rounded-md px-2.5 py-2 text-sm font-semibold text-trnet-primary transition-colors hover:bg-trnet-primary/15"
            >
              {GAMES_NAV_ITEM.label}
            </Link>
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
            <HeaderAuthControls onNavigate={closeMobile} />
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

        {/* Mobil: yatay kaydırılabilir kategori şeridi */}
        <nav
          className="mt-2 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide pb-0.5 lg:hidden [-webkit-overflow-scrolling:touch]"
          aria-label="Mobil kategori menüsü"
        >
          {PRIMARY_NAV_ITEMS.map((item) => (
            <Link
              key={item.slug}
              href={categoryHref(item.slug)}
              className={MOBILE_SCROLL_LINK_CLASS}
              onClick={closeMobile}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={categoryHref("yerel-haberler")}
            className={MOBILE_SCROLL_LINK_CLASS}
            onClick={closeMobile}
          >
            Yerel
          </Link>
          <Link
            href={GAMES_NAV_ITEM.href}
            className={`${MOBILE_SCROLL_LINK_CLASS} border-trnet-primary/30 bg-trnet-primary/15 text-trnet-primary`}
            onClick={closeMobile}
          >
            {GAMES_NAV_ITEM.label}
          </Link>
          <div className="shrink-0 [&_button]:rounded-full [&_button]:border [&_button]:border-white/10 [&_button]:bg-white/5 [&_button]:px-3.5 [&_button]:py-2 [&_button]:text-sm [&_a]:rounded-full">
            <SanaOzelNavLink onNavigate={closeMobile} />
          </div>
        </nav>
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
            <Link
              href={GAMES_NAV_ITEM.href}
              className="block rounded-xl bg-trnet-primary/20 px-4 py-3 text-base font-semibold text-trnet-primary"
              onClick={closeMobile}
            >
              {GAMES_NAV_ITEM.label}
            </Link>
            <div className="rounded-xl bg-white/5 px-4 py-3">
              <ProvincePicker variant="dark" triggerLabel="Yerel" onNavigate={closeMobile} />
            </div>
            <div className="rounded-xl bg-trnet-primary/15 px-4 py-3">
              <SanaOzelNavLink
                onNavigate={closeMobile}
                className="!w-full !bg-transparent !px-0 !py-0 text-left"
              />
            </div>
            <div className="flex gap-2 px-1 pt-2">
              <HeaderAuthControls onNavigate={closeMobile} />
              <Link
                href="/login?redirect=/sana-ozel"
                onClick={closeMobile}
                className="flex-1 rounded-xl bg-white/5 py-3 text-center text-sm font-semibold text-white"
              >
                Giriş
              </Link>
              <Link
                href="/signup?redirect=/sana-ozel&reason=personalize"
                onClick={closeMobile}
                className="flex-1 rounded-xl bg-trnet-primary py-3 text-center text-sm font-semibold text-white"
              >
                Üye Ol
              </Link>
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
