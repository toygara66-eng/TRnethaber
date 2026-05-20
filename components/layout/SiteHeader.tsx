"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";

const NAV = [
  {
    label: "Gündem",
    href: "/kategori/gundem",
    children: [
      { label: "Politika", href: "/kategori/politika" },
      { label: "Meclis", href: "/kategori/meclis" },
      { label: "Analiz", href: "/kategori/analiz" },
    ],
  },
  {
    label: "Ekonomi",
    href: "/kategori/ekonomi",
    children: [
      { label: "Piyasalar", href: "/kategori/piyasalar" },
      { label: "Şirketler", href: "/kategori/sirketler" },
      { label: "Enerji", href: "/kategori/enerji" },
    ],
  },
  {
    label: "Yerel",
    href: "/kategori/yerel",
    children: [
      { label: "İstanbul", href: "/kategori/istanbul" },
      { label: "Ankara", href: "/kategori/ankara" },
      { label: "İzmir", href: "/kategori/izmir" },
    ],
  },
  {
    label: "Spor",
    href: "/kategori/spor",
    children: [
      { label: "Futbol", href: "/kategori/futbol" },
      { label: "Basketbol", href: "/kategori/basketbol" },
      { label: "Olimpiyat", href: "/kategori/olimpiyat" },
    ],
  },
  {
    label: "Dünya",
    href: "/kategori/dunya",
    children: [
      { label: "Avrupa", href: "/kategori/avrupa" },
      { label: "Amerika", href: "/kategori/amerika" },
      { label: "Asya", href: "/kategori/asya" },
    ],
  },
  {
    label: "Teknoloji",
    href: "/kategori/teknoloji",
    children: [
      { label: "Yapay zekâ", href: "/kategori/yapay-zeka" },
      { label: "Mobil", href: "/kategori/mobil" },
      { label: "Siber güvenlik", href: "/kategori/siber-guvenlik" },
    ],
  },
];

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

  return (
    <header
      className={`sticky top-0 z-40 border-b border-white/10 bg-trnet-black/95 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-[height] duration-300 ease-out ${
        shrunk ? "h-[4.25rem]" : "h-20"
      }`}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex shrink-0 flex-col leading-none text-white"
          aria-label="TRNETHABER anasayfa"
        >
          <span
            className={`font-display tracking-[0.08em] transition-all duration-300 ${
              shrunk ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
            }`}
          >
            TRNE
            <span className="text-trnet-primary transition-colors group-hover:text-white">
              THABER
            </span>
          </span>
          <span
            className={`mt-0.5 text-[10px] font-medium uppercase tracking-[0.35em] text-white/45 transition-opacity duration-300 ${
              shrunk ? "hidden" : "hidden sm:block"
            }`}
          >
            Premium Newsroom
          </span>
        </Link>

        <nav
          className="ml-4 hidden flex-1 items-center justify-center gap-1 lg:flex"
          aria-label="Ana menü"
        >
          {NAV.map((item) => (
            <div key={item.label} className="group relative">
              <Link
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
              <div className="pointer-events-none invisible absolute left-1/2 top-full z-50 w-[min(100vw-2rem,22rem)] -translate-x-1/2 pt-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100">
                <div className="rounded-xl border border-white/10 bg-trnet-black/98 p-3 shadow-2xl ring-1 ring-black/40">
                  <div className="grid grid-cols-2 gap-1">
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className="rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-white/10 pt-2">
                    <Link
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-trnet-primary hover:bg-white/5"
                    >
                      Tüm {item.label} içerikleri
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-trnet-primary hover:bg-trnet-primary/20 hover:text-white"
            aria-label="Arama"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
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
          <div className="mx-auto max-h-[70vh] max-w-7xl space-y-1 overflow-y-auto px-4 py-4">
            {NAV.map((item) => (
              <div key={item.label} className="rounded-xl bg-white/5 p-3">
                <Link
                  href={item.href}
                  className="text-base font-semibold text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className="rounded-lg bg-black/30 px-3 py-2 text-sm text-white/80"
                      onClick={() => setMobileOpen(false)}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
