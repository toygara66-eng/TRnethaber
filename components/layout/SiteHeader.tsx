"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { SiteLogo } from "@/components/brand/SiteLogo";
import { ProvincePicker } from "@/components/category/ProvincePicker";
import { useAuth } from "@/components/auth/AuthProvider";
import { SanaOzelNavLink } from "@/components/personal/SanaOzelNavLink";
import { MoreCategoriesMenu } from "@/components/layout/MoreCategoriesMenu";
import {
  ALL_NAV_CATEGORY_ITEMS,
  categoryHref,
  GAMES_NAV_ITEM,
  NAV_BAR_PRIMARY_ITEMS,
} from "@/lib/data/nav-categories";

const NAV_LINK_CLASS =
  "shrink-0 rounded-md px-2.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white";

const MOBILE_LINK_CLASS =
  "block rounded-xl bg-white/5 px-4 py-3 text-base font-semibold text-white transition hover:bg-white/10";

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
      href="/signup"
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-trnet-black/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[height] duration-300 ease-out">
      <div
        className={`mx-auto w-full max-w-7xl px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
          shrunk ? "py-2" : "py-2.5 sm:py-3"
        }`}
      >
        <div className="flex h-11 items-center justify-between gap-3 sm:h-12">
          <SiteLogo
            size={shrunk ? "sm" : "md"}
            showTagline={!shrunk}
            className="relative z-50 shrink-0 transition-all duration-300"
          />

          {/* Masaüstü: tek satır — 5 ana kategori + yardımcılar + Daha Fazla */}
          <nav
            className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex"
            aria-label="Ana menü"
          >
            {NAV_BAR_PRIMARY_ITEMS.map((item) => (
              <Link
                key={item.slug}
                href={categoryHref(item.slug)}
                className={NAV_LINK_CLASS}
              >
                {item.label}
              </Link>
            ))}
            <ProvincePicker variant="dark" triggerLabel="Yerel" onNavigate={closeMobile} />
            <SanaOzelNavLink onNavigate={closeMobile} />
            <Link
              href={GAMES_NAV_ITEM.href}
              className={`${NAV_LINK_CLASS} font-semibold text-trnet-primary hover:bg-trnet-primary/15`}
            >
              {GAMES_NAV_ITEM.label}
            </Link>
            <MoreCategoriesMenu onNavigate={closeMobile} />
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
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-trnet-primary hover:bg-trnet-primary/20 lg:hidden"
              aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobil: tüm kategoriler tek panelde */}
      {mobileOpen ? (
        <div className="border-t border-white/10 bg-trnet-black lg:hidden">
          <nav
            className="mx-auto max-h-[75vh] max-w-7xl overflow-y-auto px-4 py-4"
            aria-label="Mobil menü"
          >
            <div className="space-y-1">
              {ALL_NAV_CATEGORY_ITEMS.map((item) => (
                <Link
                  key={item.slug}
                  href={categoryHref(item.slug)}
                  className={MOBILE_LINK_CLASS}
                  onClick={closeMobile}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={GAMES_NAV_ITEM.href}
                className={`${MOBILE_LINK_CLASS} bg-trnet-primary/20 text-trnet-primary`}
                onClick={closeMobile}
              >
                {GAMES_NAV_ITEM.label}
              </Link>
              <div className={`${MOBILE_LINK_CLASS} py-2`}>
                <ProvincePicker variant="dark" triggerLabel="Yerel" onNavigate={closeMobile} />
              </div>
              <div className="rounded-xl bg-trnet-primary/15 px-4 py-3">
                <SanaOzelNavLink
                  onNavigate={closeMobile}
                  className="!w-full !bg-transparent !px-0 !py-0 text-left"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2 border-t border-white/10 pt-4">
              <HeaderAuthControls onNavigate={closeMobile} />
              <Link
                href="/login?redirect=/sana-ozel"
                onClick={closeMobile}
                className="flex-1 rounded-xl bg-white/5 py-3 text-center text-sm font-semibold text-white"
              >
                Giriş
              </Link>
              <Link
                href="/signup"
                onClick={closeMobile}
                className="flex-1 rounded-xl bg-trnet-primary py-3 text-center text-sm font-semibold text-white"
              >
                Üye Ol
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
