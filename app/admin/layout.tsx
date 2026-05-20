import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-trnet-surface text-trnet-text antialiased">
      <AdminSidebar />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col bg-trnet-surface">
        {children}
      </div>
    </div>
  );
}
