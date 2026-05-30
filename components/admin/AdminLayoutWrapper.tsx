"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-basic-auth";

export function AdminLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === ADMIN_LOGIN_PATH) {
    return (
      <div className="min-h-dvh bg-trnet-black text-white antialiased">{children}</div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
