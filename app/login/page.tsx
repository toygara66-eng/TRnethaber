import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giriş Yap",
  description: "TRNETHABER üye girişi",
};

type PageProps = {
  searchParams: { redirect?: string; error?: string };
};

export default function LoginPage({ searchParams }: PageProps) {
  const redirect = searchParams.redirect?.trim() || "/sana-ozel";
  const authError = searchParams.error === "auth_callback" ? "auth_callback" : null;

  return (
    <AuthShell
      title="Giriş Yap"
      subtitle="Hesabına giriş yap ve kişiselleştirilmiş haber akışına eriş."
    >
      <LoginForm redirect={redirect} authError={authError} />
    </AuthShell>
  );
}
