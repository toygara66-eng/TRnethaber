import type { Metadata } from "next";
import { AdminLayoutWrapper } from "@/components/admin/AdminLayoutWrapper";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}
