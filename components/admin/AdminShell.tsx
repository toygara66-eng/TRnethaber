"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { AdminSidebarDesktop, AdminSidebarMobile } from "@/components/admin/AdminSidebar";
import { brandLogoClassName } from "@/lib/fonts/brand-logo";

type Props = {
  children: ReactNode;
};

export function AdminShell({ children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-dvh flex-col bg-trnet-surface text-trnet-text antialiased md:flex-row">
      <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-trnet-black px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
          aria-label="Menüyü aç"
          aria-expanded={menuOpen}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Link href="/admin/articles" className={`trnet-brand-logo ${brandLogoClassName} text-xl tracking-[0.06em]`}>
          <span className="text-white">TRNET</span>
          <span className="text-trnet-primary">HABER</span>
        </Link>
        <span className="w-11" aria-hidden />
      </header>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] md:hidden"
          aria-label="Menüyü kapat"
          onClick={closeMenu}
        />
      ) : null}

      <AdminSidebarMobile open={menuOpen} onClose={closeMenu} />
      <AdminSidebarDesktop />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-trnet-surface">{children}</main>
    </div>
  );
}
