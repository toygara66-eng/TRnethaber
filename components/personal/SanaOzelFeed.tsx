"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Sparkles, Trophy } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NewsCard } from "@/components/home/NewsCard";
import type { HomeCard } from "@/lib/types/home";

function FeedSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-black/[0.06] bg-trnet-card"
        >
          <div className="aspect-[16/10] animate-pulse bg-neutral-200" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
            <div className="h-5 w-full animate-pulse rounded bg-neutral-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  city,
  team,
  onEditProfile,
}: {
  city: string;
  team?: string | null;
  onEditProfile: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-black/[0.06] bg-trnet-card px-8 py-14 text-center shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-trnet-primary/10 text-trnet-primary">
        <MapPin className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold text-trnet-text">
        {city}
        {team ? ` ve ${team}` : ""} için henüz haber yok
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-trnet-text/55">
        Henüz bu tercihlere uygun haber bulunmuyor; ancak ajanlarımız ve RSS istihbarat
        ağımız çalışıyor. Kısa süre içinde yeni başlıklar burada görünecek.
      </p>
      <button
        type="button"
        onClick={onEditProfile}
        className="mt-6 rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-trnet-text hover:bg-trnet-surface"
      >
        Tercihleri güncelle
      </button>
    </div>
  );
}

export function SanaOzelFeed() {
  const { profile, ready, openOnboarding } = useAuth();
  const city = profile?.city?.trim() ?? "";
  const team = profile?.favorite_team?.trim() ?? null;
  const [cards, setCards] = useState<HomeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feed/personal", {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });
      const json = (await res.json()) as {
        ok: boolean;
        cards?: HomeCard[];
        error?: string;
        needsOnboarding?: boolean;
      };
      if (json.needsOnboarding) {
        openOnboarding();
        setCards([]);
        return;
      }
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Akış yüklenemedi");
        setCards([]);
        return;
      }
      setCards(json.cards ?? []);
    } catch {
      setError("Bağlantı hatası");
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [openOnboarding]);

  useEffect(() => {
    if (!ready) return;
    if (!city) {
      setLoading(false);
      setCards([]);
      return;
    }
    void loadFeed();
  }, [city, team, ready, loadFeed]);

  if (!ready || loading) {
    return (
      <div>
        <header className="mb-8">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-neutral-200" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-neutral-100" />
        </header>
        <FeedSkeleton />
      </div>
    );
  }

  if (!city) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-trnet-primary/30 bg-trnet-primary/5 px-8 py-14 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-trnet-primary" aria-hidden />
        <h2 className="mt-4 font-display text-2xl font-semibold text-trnet-text">
          Profilini tamamla
        </h2>
        <p className="mt-2 text-sm text-trnet-text/55">
          İl ve takım seçerek kişiselleştirilmiş akışını oluştur.
        </p>
        <button
          type="button"
          onClick={openOnboarding}
          className="mt-6 rounded-full bg-trnet-primary px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-trnet-breaking"
        >
          Tercihleri Seç
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-black/[0.06] pb-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-trnet-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Sana özel akış
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-trnet-text sm:text-4xl">
            {city} Haberleri
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-trnet-text/55">
            <span>Şehrine ve tercihlerine göre filtrelenmiş başlıklar</span>
            {team ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-trnet-primary/10 px-2.5 py-0.5 text-xs font-semibold text-trnet-primary">
                <Trophy className="h-3 w-3" aria-hidden />
                {team}
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={openOnboarding}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-trnet-text shadow-sm hover:border-trnet-primary/40"
        >
          Tercihleri düzenle
        </button>
      </header>

      {error ? (
        <p className="mb-6 rounded-lg border border-trnet-breaking/20 bg-trnet-breaking/10 px-4 py-3 text-sm text-trnet-breaking">
          {error}
        </p>
      ) : null}

      {cards.length === 0 ? (
        <EmptyState city={city} team={team} onEditProfile={openOnboarding} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <NewsCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
