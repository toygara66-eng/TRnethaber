"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  Network,
  PlusCircle,
} from "lucide-react";

const NAV = [
  {
    label: "Haber Yönetimi",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Haber Ekle",
    href: "/admin/haber-ekle",
    icon: PlusCircle,
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
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-trnet-black text-white">
      <div className="border-b border-white/10 px-5 py-6">
        <Link href="/" className="font-display text-2xl tracking-[0.06em]">
          TRNE<span className="text-trnet-primary">THABER</span>
        </Link>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-white/45">
          <FileText className="h-3 w-3" aria-hidden />
          Otonom CMS
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Admin menü">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
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

      <div className="border-t border-white/10 px-4 py-4 text-xs text-white/40">
        <Link href="/" className="hover:text-white/70">
          ← Vitrine dön
        </Link>
      </div>
    </aside>
  );
}
