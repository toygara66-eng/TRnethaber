import type { Metadata } from "next";
import { LegalSiteShell } from "@/components/layout/LegalSiteShell";
import { StaticLegalPage } from "@/components/legal/StaticLegalPage";

export const metadata: Metadata = {
  title: "Künye",
  description: "TRNETHABER künye ve yayın bilgileri.",
};

export default function KunyePage() {
  return (
    <LegalSiteShell>
      <StaticLegalPage title="Künye" />
    </LegalSiteShell>
  );
}
