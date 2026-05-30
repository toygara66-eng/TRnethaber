import type { Metadata } from "next";
import { LegalSiteShell } from "@/components/layout/LegalSiteShell";
import { StaticLegalPage } from "@/components/legal/StaticLegalPage";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description: "TRNETHABER çerez politikası.",
};

export default function CerezPolitikasiPage() {
  return (
    <LegalSiteShell>
      <StaticLegalPage title="Çerez Politikası" />
    </LegalSiteShell>
  );
}
