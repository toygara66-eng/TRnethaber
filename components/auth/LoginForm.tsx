"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  redirect?: string;
  authError?: string | null;
};

export function LoginForm({
  redirect: redirectProp = "/sana-ozel",
  authError = null,
}: Props) {
  const router = useRouter();
  const redirect = redirectProp.startsWith("/") ? redirectProp : "/sana-ozel";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push(redirect.startsWith("/") ? redirect : "/sana-ozel");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {authError ? (
        <p className="rounded-lg border border-trnet-breaking/30 bg-trnet-breaking/10 px-3 py-2 text-sm text-trnet-breaking">
          Giriş tamamlanamadı. Lütfen tekrar deneyin.
        </p>
      ) : null}

      <GoogleSignInButton redirect={redirect} />

      <div className="flex items-center gap-3 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/10" />
        veya e-posta ile
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
            E-posta
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-trnet-primary focus:outline-none focus:ring-1 focus:ring-trnet-primary"
            placeholder="ornek@email.com"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
            Şifre
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-trnet-primary focus:outline-none focus:ring-1 focus:ring-trnet-primary"
            placeholder="••••••••"
          />
        </label>

        {error ? (
          <p className="rounded-lg border border-trnet-breaking/30 bg-trnet-breaking/10 px-3 py-2 text-sm text-trnet-breaking">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-trnet-primary py-3 text-sm font-semibold text-white transition hover:bg-trnet-breaking disabled:opacity-60"
        >
          {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>
      </form>

      <p className="text-center text-sm text-white/50">
        Hesabın yok mu?{" "}
        <Link
          href={`/signup?redirect=${encodeURIComponent(redirect)}`}
          className="font-semibold text-trnet-primary hover:text-white"
        >
          Üye ol
        </Link>
      </p>
    </div>
  );
}
