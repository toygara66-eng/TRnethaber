import type { Metadata } from "next";
import { LegalSiteShell } from "@/components/layout/LegalSiteShell";
import { StaticLegalPage } from "@/components/legal/StaticLegalPage";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "TRNETHABER gizlilik politikası.",
};

export default function GizlilikPolitikasiPage() {
  return (
    <LegalSiteShell>
      <StaticLegalPage title="Gizlilik Politikası" />
    </LegalSiteShell>
  );
}
