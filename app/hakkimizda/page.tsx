import type { Metadata } from "next";
import { LegalSiteShell } from "@/components/layout/LegalSiteShell";
import { StaticLegalPage } from "@/components/legal/StaticLegalPage";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "TRNETHABER hakkında kurumsal bilgiler.",
};

export default function HakkimizdaPage() {
  return (
    <LegalSiteShell>
      <StaticLegalPage title="Hakkımızda" />
    </LegalSiteShell>
  );
}
