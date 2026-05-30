import type { Metadata } from "next";
import { LegalSiteShell } from "@/components/layout/LegalSiteShell";
import { StaticLegalPage } from "@/components/legal/StaticLegalPage";

export const metadata: Metadata = {
  title: "İletişim",
  description: "TRNETHABER iletişim bilgileri.",
};

export default function IletisimPage() {
  return (
    <LegalSiteShell>
      <StaticLegalPage
        title="İletişim"
        lead="İletişim formu ve kurumsal iletişim kanallarımız yapım aşamasındadır."
      />
    </LegalSiteShell>
  );
}
