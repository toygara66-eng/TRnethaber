import type { Metadata } from "next";
import { SanaOzelFeed } from "@/components/personal/SanaOzelFeed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Sana Özel",
  description: "Üyelere özel kişiselleştirilmiş haber akışı — TRNETHABER",
};

export default function SanaOzelPage() {
  return (
    <main className="min-h-[60vh] bg-trnet-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SanaOzelFeed />
      </div>
    </main>
  );
}
