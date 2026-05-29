"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, LayoutGrid, Sparkles } from "lucide-react";

const HOMEPAGE_SETTINGS_STORAGE_KEY = "trnethaber-homepage-settings";

type HomepageLayoutSettings = {
  topHeadline: {
    enabled: boolean;
    aiAuto: boolean;
  };
  mostRead: {
    enabled: boolean;
    aiAuto: boolean;
  };
};

const DEFAULT_HOMEPAGE_LAYOUT: HomepageLayoutSettings = {
  topHeadline: { enabled: true, aiAuto: false },
  mostRead: { enabled: true, aiAuto: false },
};

function readHomepageLayoutSettings(): HomepageLayoutSettings {
  if (typeof window === "undefined") return DEFAULT_HOMEPAGE_LAYOUT;
  try {
    const raw = window.localStorage.getItem(HOMEPAGE_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_HOMEPAGE_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<HomepageLayoutSettings>;
    return {
      topHeadline: {
        enabled: parsed.topHeadline?.enabled ?? DEFAULT_HOMEPAGE_LAYOUT.topHeadline.enabled,
        aiAuto: parsed.topHeadline?.aiAuto ?? DEFAULT_HOMEPAGE_LAYOUT.topHeadline.aiAuto,
      },
      mostRead: {
        enabled: parsed.mostRead?.enabled ?? DEFAULT_HOMEPAGE_LAYOUT.mostRead.enabled,
        aiAuto: parsed.mostRead?.aiAuto ?? DEFAULT_HOMEPAGE_LAYOUT.mostRead.aiAuto,
      },
    };
  } catch {
    return DEFAULT_HOMEPAGE_LAYOUT;
  }
}

function persistHomepageLayoutSettings(settings: HomepageLayoutSettings) {
  try {
    window.localStorage.setItem(
      HOMEPAGE_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
    window.dispatchEvent(
      new CustomEvent("trnethaber-homepage-settings", { detail: settings }),
    );
  } catch (err) {
    console.warn("[homepage-settings] localStorage yazılamadı:", err);
  }
}

type ToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/50">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "bg-trnet-primary" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof LayoutGrid;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-trnet-black/80 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-trnet-primary/15 text-trnet-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function HomepageSettingsPage() {
  const [settings, setSettings] = useState<HomepageLayoutSettings>(DEFAULT_HOMEPAGE_LAYOUT);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setSettings(readHomepageLayoutSettings());
    setHydrated(true);
  }, []);

  const updateSettings = useCallback(
    (patch: {
      topHeadline?: Partial<HomepageLayoutSettings["topHeadline"]>;
      mostRead?: Partial<HomepageLayoutSettings["mostRead"]>;
    }) => {
    setSettings((prev) => {
      const next: HomepageLayoutSettings = {
        topHeadline: { ...prev.topHeadline, ...patch.topHeadline },
        mostRead: { ...prev.mostRead, ...patch.mostRead },
      };
      persistHomepageLayoutSettings(next);
      setSavedAt(new Date().toLocaleTimeString("tr-TR"));
      return next;
    });
  },
  [],
);

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center bg-trnet-black p-8 text-sm text-white/50">
        Ayarlar yükleniyor…
      </div>
    );
  }

  return (
    <>
      <header className="border-b border-white/10 bg-trnet-black px-6 py-5 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-white/45 transition hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Admin panele dön
            </Link>
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              Ana Sayfa Düzeni
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Üst manşet ve en çok okunanlar — canlıda veritabanı / Context ile senkronlanacak.
            </p>
          </div>
          {savedAt ? (
            <p className="text-xs font-medium text-emerald-400/90">
              Kaydedildi · {savedAt}
            </p>
          ) : null}
        </div>
      </header>

      <div className="flex-1 space-y-6 bg-trnet-black p-6 lg:p-8">
        <SettingsSection title="Üst Manşet Ayarları" icon={LayoutGrid}>
          <ToggleRow
            label="Üst Manşet Alanını Aç/Kapat"
            description="Ana manşetin üzerindeki 4 kutulu üst başlık satırını gösterir veya gizler."
            checked={settings.topHeadline.enabled}
            onChange={(enabled) => updateSettings({ topHeadline: { enabled } })}
          />
          <ToggleRow
            label="Yapay Zeka Otomatik Seçsin mi?"
            description="Açıkken üst manşet kutuları AI öncelik sırasına göre (simüle) doldurulur."
            checked={settings.topHeadline.aiAuto}
            onChange={(aiAuto) => updateSettings({ topHeadline: { aiAuto } })}
          />
        </SettingsSection>

        <SettingsSection title="Manşet Ayarları" icon={Sparkles}>
          <ToggleRow
            label="En Çok Okunanlar Bölümünü Aç/Kapat"
            description="Manşet karuselinin yanındaki dikey EN ÇOK OKUNANLAR sütununu kontrol eder."
            checked={settings.mostRead.enabled}
            onChange={(enabled) => updateSettings({ mostRead: { enabled } })}
          />
          <ToggleRow
            label="Yapay Zeka Otomatik Seçsin mi?"
            description="Açıkken üst manşet haberleri view_count (gerçek + admin hit) skoruna göre sıralanır. En çok okunanlar her zaman en yüksek view_count değerinden gelir."
            checked={settings.mostRead.aiAuto}
            onChange={(aiAuto) => updateSettings({ mostRead: { aiAuto } })}
          />
        </SettingsSection>

        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-4 text-xs leading-relaxed text-white/45">
          Değişiklikler <code className="text-white/70">localStorage</code> üzerinde
          tutulur. Ana sayfayı yenileyerek veya açık sekmede anında önizleyebilirsiniz.
          Production’da bu anahtar Supabase site_settings tablosuna taşınacaktır.
        </div>
      </div>
    </>
  );
}
