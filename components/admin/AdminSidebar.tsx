"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FolderOpen,
  ImageIcon,
  LayoutDashboard,
  Link2,
  Network,
  PlusCircle,
  Radio,
  X,
} from "lucide-react";

const NAV = [
  {
    label: "Haber Yönetimi",
    href: "/admin/articles",
    icon: LayoutDashboard,
    exact: false,
  },
  {
    label: "Haber Ekle",
    href: "/admin/haber-ekle",
    icon: PlusCircle,
  },
  {
    label: "Medya Kütüphanesi",
    href: "/admin/fotograflar",
    icon: ImageIcon,
  },
  {
    label: "Haber Kaynakları",
    href: "/admin/kaynaklar",
    icon: Radio,
  },
  {
    label: "404 & Link Yönetimi",
    href: "/admin/redirects",
    icon: Link2,
  },
  {
    label: "Kurumsal Kimlik",
    href: "/admin/settings",
    icon: FileText,
  },
  {
    label: "Kategoriler",
    href: "/admin/kategoriler",
    icon: FolderOpen,
  },
  {
    label: "Semantik Varlıklar",
    href: "/admin/varliklar",
    icon: Network,
  },
] as const;

function SidebarBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div>
      <Link href="/" className="font-display text-2xl tracking-[0.06em]" onClick={onNavigate}>
        <span className="text-white">TRNET</span>
        <span className="text-trnet-primary">HABER</span>
      </Link>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-white/45">
        <FileText className="h-3 w-3" aria-hidden />
        Otonom CMS
      </p>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin menü">
      {NAV.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition md:py-2.5 ${
              active
                ? "bg-trnet-primary text-white shadow-md shadow-trnet-primary/25"
                : "text-white/75 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    onNavigate?.();
    window.location.href = "/admin/login";
  }

  return (
    <div className="space-y-1 border-t border-white/10 px-4 py-4 text-xs text-white/40">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center hover:text-white/70"
        onClick={onNavigate}
      >
        ← Vitrine dön
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        className="inline-flex min-h-[44px] items-center text-white/50 hover:text-white/80"
      >
        Çıkış yap
      </button>
    </div>
  );
}

/** Masaüstü — her zaman görünür */
export function AdminSidebarDesktop() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-trnet-black text-white md:flex">
      <div className="border-b border-white/10 px-5 py-6">
        <SidebarBrand />
      </div>
      <SidebarNav />
      <SidebarFooter />
    </aside>
  );
}

/** Mobil — drawer */
export function AdminSidebarMobile({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col border-r border-white/10 bg-trnet-black text-white md:hidden">
      <div className="flex items-start justify-between border-b border-white/10 px-4 py-5">
        <SidebarBrand onNavigate={onClose} />
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
          aria-label="Menüyü kapat"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <SidebarNav onNavigate={onClose} />
      <SidebarFooter onNavigate={onClose} />
    </aside>
  );
}

/** @deprecated AdminShell içinde Desktop + Mobile kullanın */
export function AdminSidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <AdminSidebarDesktop />
      <AdminSidebarMobile open={mobileOpen} onClose={onNavigate ?? (() => {})} />
    </>
  );
}
