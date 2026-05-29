"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

type Props = {
  onNavigate?: () => void;
  className?: string;
};

export function SanaOzelNavLink({ onNavigate, className = "" }: Props) {
  const { user, profile, ready, openOnboarding } = useAuth();

  if (!ready || !user) return null;

  const city = profile?.city?.trim();
  const team = profile?.favorite_team?.trim();
  const label = city
    ? team
      ? `🌟 ${city} · ${team}`
      : `🌟 ${city} Haberleri`
    : "🌟 Sana Özel";

  const baseClass =
    "shrink-0 rounded-md px-2.5 py-2 text-sm font-semibold transition-colors " +
    "bg-trnet-primary/15 text-trnet-primary hover:bg-trnet-primary/25";

  if (!city || !profile?.onboarding_completed) {
    return (
      <button
        type="button"
        onClick={() => {
          openOnboarding();
          onNavigate?.();
        }}
        className={`${baseClass} ${className}`}
      >
        {label}
      </button>
    );
  }

  return (
    <Link
      href="/sana-ozel"
      onClick={onNavigate}
      className={`${baseClass} ${className}`}
    >
      {label}
    </Link>
  );
}
