"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Search, Sparkles, Trophy, X } from "lucide-react";
import { updateMemberProfile } from "@/lib/actions/profile";
import { FAVORITE_TEAM_OPTIONS, SUPER_LIG_TEAMS } from "@/lib/data/turkish-teams";

const superLigSet = new Set<string>(SUPER_LIG_TEAMS);
import { TURKIYE_ILLER } from "@/lib/data/turkiye-iller";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialCity?: string | null;
  initialTeam?: string | null;
};

function normalizeForSearch(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

export function MemberOnboardingModal({
  open,
  onClose,
  onSaved,
  initialCity,
  initialTeam,
}: Props) {
  const [city, setCity] = useState(initialCity ?? "");
  const [team, setTeam] = useState(initialTeam ?? "");
  const [cityQuery, setCityQuery] = useState("");
  const [teamQuery, setTeamQuery] = useState("");
  const [step, setStep] = useState<"city" | "team">("city");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCity(initialCity ?? "");
    setTeam(initialTeam ?? "");
    setStep(initialCity ? "team" : "city");
    setCityQuery("");
    setTeamQuery("");
    setError(null);
    const t = window.setTimeout(() => searchRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, initialCity, initialTeam]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const filteredCities = useMemo(() => {
    const q = normalizeForSearch(cityQuery);
    if (!q) return TURKIYE_ILLER;
    return TURKIYE_ILLER.filter((il) => normalizeForSearch(il.name).includes(q));
  }, [cityQuery]);

  const filteredTeams = useMemo(() => {
    const q = normalizeForSearch(teamQuery);
    const pool = q
      ? FAVORITE_TEAM_OPTIONS
      : [...SUPER_LIG_TEAMS, ...FAVORITE_TEAM_OPTIONS.filter((t) => !superLigSet.has(t))];
    const unique = Array.from(new Set(pool));
    if (!q) return unique.slice(0, 40);
    return unique.filter((t) => normalizeForSearch(t).includes(q));
  }, [teamQuery]);

  const handleSave = useCallback(async () => {
    if (!city.trim() || !team.trim()) {
      setError("İl ve takım seçimi zorunludur.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateMemberProfile({ city, favorite_team: team });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved();
  }, [city, team, onSaved]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[4px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(36rem,92vh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-trnet-black shadow-[0_28px_70px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/10 bg-gradient-to-r from-trnet-primary/20 to-transparent px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-trnet-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Üye profili
              </p>
              <h2 id={titleId} className="mt-1 font-display text-2xl font-semibold text-white">
                Deneyimini kişiselleştir
              </h2>
              <p className="mt-1.5 text-sm text-white/55">
                {step === "city"
                  ? "Haber akışın için ilini seç."
                  : "Tuttuğun takımı seç — spor haberleri de akışına eklensin."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/45 hover:bg-white/10 hover:text-white"
              aria-label="Kapat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setStep("city")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                step === "city"
                  ? "bg-trnet-primary text-white"
                  : "bg-white/10 text-white/60"
              }`}
            >
              1. İl
            </button>
            <button
              type="button"
              onClick={() => (city ? setStep("team") : setError("Önce il seçin."))}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                step === "team"
                  ? "bg-trnet-primary text-white"
                  : "bg-white/10 text-white/60"
              }`}
            >
              2. Takım
            </button>
          </div>
        </div>

        <label className="relative border-b border-white/10 px-5 py-3">
          <span className="sr-only">{step === "city" ? "İl ara" : "Takım ara"}</span>
          <Search
            className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={step === "city" ? cityQuery : teamQuery}
            onChange={(e) =>
              step === "city"
                ? setCityQuery(e.target.value)
                : setTeamQuery(e.target.value)
            }
            placeholder={step === "city" ? "İl ara…" : "Takım ara…"}
            className="w-full rounded-xl border border-white/15 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-trnet-primary focus:outline-none focus:ring-1 focus:ring-trnet-primary"
            autoComplete="off"
          />
        </label>

        <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:thin]">
          {step === "city"
            ? filteredCities.length > 0
              ? filteredCities.map((il) => (
                  <li key={il.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        setCity(il.name);
                        setStep("team");
                        setError(null);
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-base font-medium transition ${
                        city === il.name
                          ? "bg-trnet-primary/20 text-trnet-primary"
                          : "text-white hover:bg-white/5"
                      }`}
                    >
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                      {il.name}
                    </button>
                  </li>
                ))
              : (
                <li className="px-4 py-10 text-center text-sm text-white/50">Sonuç yok</li>
                )
            : filteredTeams.length > 0
              ? filteredTeams.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => {
                        setTeam(t);
                        setError(null);
                      }}
                      className={`flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-base font-medium transition ${
                        team === t
                          ? "bg-trnet-primary/20 text-trnet-primary"
                          : "text-white hover:bg-white/5"
                      }`}
                    >
                      <Trophy className="h-4 w-4 shrink-0" aria-hidden />
                      {t}
                    </button>
                  </li>
                ))
              : (
                <li className="px-4 py-10 text-center text-sm text-white/50">Sonuç yok</li>
                )}
        </ul>

        <div className="border-t border-white/10 px-5 py-4">
          {error ? (
            <p className="mb-3 text-sm text-trnet-breaking">{error}</p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-white/45">
              {city ? `İl: ${city}` : "İl seçilmedi"}
              {team ? ` · Takım: ${team}` : ""}
            </p>
            <button
              type="button"
              disabled={saving || !city || !team}
              onClick={() => void handleSave()}
              className="rounded-full bg-trnet-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-trnet-breaking disabled:opacity-50"
            >
              {saving ? "Kaydediliyor…" : "Kaydet ve akışı aç"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
