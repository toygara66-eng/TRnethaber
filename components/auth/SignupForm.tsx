"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  redirect?: string;
  personalize?: boolean;
};

export function SignupForm({
  redirect: redirectProp = "/sana-ozel",
  personalize: isPersonalize = false,
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
    const origin = window.location.origin;
    const safeRedirect = redirect.startsWith("/") ? redirect : "/sana-ozel";
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(safeRedirect)}`,
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    router.push(safeRedirect);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {isPersonalize ? (
        <div className="rounded-xl border border-trnet-primary/30 bg-trnet-primary/10 px-4 py-3 text-sm text-white/80">
          <p className="font-semibold text-trnet-primary">🌟 Sana Özel akışı üyelere özel</p>
          <p className="mt-1 text-white/60">
            Üye ol ve deneyimini kişiselleştir — şehrini ve tuttuğun takımı seç, haber akışın
            sana göre şekillensin.
          </p>
        </div>
      ) : null}

      <GoogleSignInButton redirect={redirect} label="Google ile üye ol" />

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
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">
            Şifre (en az 6 karakter)
          </span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-trnet-primary focus:outline-none focus:ring-1 focus:ring-trnet-primary"
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
          {loading ? "Kayıt olunuyor…" : "Üye Ol"}
        </button>
      </form>

      <p className="text-center text-sm text-white/50">
        Zaten üye misin?{" "}
        <Link
          href={`/login?redirect=${encodeURIComponent(redirect)}`}
          className="font-semibold text-trnet-primary hover:text-white"
        >
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
