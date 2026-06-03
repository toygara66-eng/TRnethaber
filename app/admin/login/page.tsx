"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import Link from "next/link";
import { brandLogoClassName } from "@/lib/fonts/brand-logo";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect")?.trim() || "/admin/articles";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Giriş başarısız");
        return;
      }

      const safeRedirect =
        redirectTo.startsWith("/admin") && !redirectTo.startsWith("/admin/login")
          ? redirectTo
          : "/admin/articles";

      router.replace(safeRedirect);
      router.refresh();
    } catch {
      setError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className={`trnet-brand-logo ${brandLogoClassName} text-3xl tracking-[0.06em]`}>
            <span className="text-white">TRNET</span>
            <span className="text-trnet-primary">HABER</span>
          </p>
          <p className="mt-2 text-sm text-white/50">Admin paneli girişi</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl"
        >
          {error ? (
            <p className="rounded-lg border border-trnet-breaking/30 bg-trnet-breaking/10 px-3 py-2 text-sm text-trnet-breaking">
              {error}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-semibold text-white/90">
              Kullanıcı adı
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-trnet-black px-4 py-3 text-white outline-none focus:border-trnet-primary focus:ring-2 focus:ring-trnet-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-semibold text-white/90">
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-trnet-black px-4 py-3 text-white outline-none focus:border-trnet-primary focus:ring-2 focus:ring-trnet-primary/30"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 w-full rounded-full bg-trnet-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-trnet-primary/25 transition hover:bg-trnet-breaking disabled:opacity-60"
          >
            {pending ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>

        <p className="mt-6 text-center">
          <Link href="/" className="text-sm text-white/45 hover:text-white/70">
            ← Ana siteye dön
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-white/50">
          Yükleniyor…
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
