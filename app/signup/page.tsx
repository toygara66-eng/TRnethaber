import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Üye Ol",
  description: "TRNETHABER üyelik kaydı",
};

type PageProps = {
  searchParams: { redirect?: string; reason?: string };
};

export default function SignupPage({ searchParams }: PageProps) {
  const redirect = searchParams.redirect?.trim() || "/sana-ozel";
  const personalize = searchParams.reason === "personalize";

  return (
    <AuthShell
      title="Üye Ol"
      subtitle="Ücretsiz hesap oluştur; şehrini ve takımını seçerek Sana Özel akışını aç."
    >
      <SignupForm redirect={redirect} personalize={personalize} />
    </AuthShell>
  );
}
