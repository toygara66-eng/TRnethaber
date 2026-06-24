"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import {
  deleteRedirectAction,
  saveRedirectAction,
  toggleRedirectAction,
} from "@/lib/actions/redirect-admin";
import type { BrokenLinkRow, RedirectRow } from "@/lib/queries/redirects";

type Props = {
  brokenLinks: BrokenLinkRow[];
  redirects: RedirectRow[];
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function RedirectManager({ brokenLinks, redirects }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modalLink, setModalLink] = useState<BrokenLinkRow | null>(null);
  const [targetUrl, setTargetUrl] = useState("/");
  const [manualFromUrl, setManualFromUrl] = useState("");
  const [manualToUrl, setManualToUrl] = useState("/");

  const onSaveManualRedirect = () => {
    if (!manualFromUrl.trim() || !manualToUrl.trim()) {
      setError("Kaynak ve hedef URL zorunludur.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await saveRedirectAction(manualFromUrl, manualToUrl);
      if (!result.ok) {
        setError(result.error ?? "Kayıt başarısız.");
        return;
      }
      setManualFromUrl("");
      setManualToUrl("/");
      router.refresh();
    });
  };

  const onSaveRedirect = () => {
    if (!modalLink) return;
    startTransition(async () => {
      setError(null);
      const result = await saveRedirectAction(modalLink.url, targetUrl);
      if (!result.ok) {
        setError(result.error ?? "Kayıt başarısız.");
        return;
      }
      setModalLink(null);
      setTargetUrl("/");
      router.refresh();
    });
  };

  const onDeleteRedirect = (id: string) => {
    if (!window.confirm("Bu yönlendirme kuralını silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteRedirectAction(id);
      if (!result.ok) setError(result.error ?? "Silinemedi.");
      else router.refresh();
    });
  };

  const onToggleRedirect = (id: string, next: boolean) => {
    startTransition(async () => {
      setError(null);
      const result = await toggleRedirectAction(id, next);
      if (!result.ok) setError(result.error ?? "Güncellenemedi.");
      else router.refresh();
    });
  };

  return (
    <>
      {error ? (
        <p className="mb-4 rounded-lg border border-trnet-breaking/20 bg-trnet-breaking/10 px-4 py-3 text-sm text-trnet-breaking">
          {error}
        </p>
      ) : null}

      <section className="admin-card mb-6 overflow-hidden sm:mb-8">
        <div className="border-b border-black/[0.06] bg-trnet-surface/80 px-4 py-4 sm:px-5">
          <h2 className="font-display text-lg font-semibold text-trnet-text sm:text-xl">
            Manuel 301 Yönlendirme Ekle
          </h2>
          <p className="mt-1 text-sm text-trnet-text/55">
            Eski URL ile yeni hedefi girin — middleware anında 301 uygular.
          </p>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <label className="block text-sm font-semibold text-trnet-text" htmlFor="manual_from_url">
              Eski URL (kaynak)
            </label>
            <input
              id="manual_from_url"
              type="text"
              value={manualFromUrl}
              onChange={(e) => setManualFromUrl(e.target.value)}
              placeholder="/haber/eski-slug veya tam URL"
              className="admin-input mt-1.5 w-full font-mono text-sm"
            />
            <p className="mt-1.5 text-xs text-trnet-text/50">
              Ziyaretçinin 404 aldığı adres
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-trnet-text" htmlFor="manual_to_url">
              Yeni URL (hedef)
            </label>
            <input
              id="manual_to_url"
              type="text"
              value={manualToUrl}
              onChange={(e) => setManualToUrl(e.target.value)}
              placeholder="/haber/yeni-slug veya https://…"
              className="admin-input mt-1.5 w-full font-mono text-sm"
            />
            <p className="mt-1.5 text-xs text-trnet-text/50">
              Yönlendirilecek sayfa
            </p>
          </div>
        </div>
        <div className="border-t border-black/[0.06] px-4 py-4 sm:px-5">
          <button
            type="button"
            className="admin-btn-primary disabled:opacity-50"
            onClick={onSaveManualRedirect}
            disabled={pending}
          >
            Yönlendirme kuralını kaydet
          </button>
        </div>
      </section>

      <section className="admin-card overflow-hidden">
        <div className="border-b border-black/[0.06] bg-trnet-surface/80 px-4 py-4 sm:px-5">
          <h2 className="font-display text-lg font-semibold text-trnet-text sm:text-xl">
            404 Veren Linkler
          </h2>
          <p className="mt-1 text-sm text-trnet-text/55">
            En çok tıklanan kırık adresler — yanından 301 yönlendirme ekleyin.
          </p>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {brokenLinks.length === 0 ? (
            <p className="py-6 text-center text-sm text-trnet-text/50">Henüz kayıtlı kırık link yok.</p>
          ) : (
            brokenLinks.map((row) => (
              <article key={row.id} className="rounded-xl border border-black/[0.06] bg-white p-4">
                <p className="break-all font-mono text-xs text-trnet-text">{row.url}</p>
                <p className="mt-2 text-xs text-trnet-text/55">
                  Hit: <strong className="text-trnet-text">{row.hit_count}</strong> ·{" "}
                  {formatDate(row.last_detected_at)}
                </p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setModalLink(row);
                    setTargetUrl("/");
                  }}
                  className="admin-btn-primary mt-3 disabled:opacity-50"
                >
                  Yönlendir
                </button>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <th className="px-5 py-3 font-semibold text-trnet-text">URL</th>
                <th className="px-5 py-3 font-semibold text-trnet-text">Hit</th>
                <th className="px-5 py-3 font-semibold text-trnet-text">Son görülme</th>
                <th className="px-5 py-3 font-semibold text-trnet-text">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {brokenLinks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-trnet-text/50">
                    Henüz kayıtlı kırık link yok.
                  </td>
                </tr>
              ) : (
                brokenLinks.map((row) => (
                  <tr key={row.id} className="hover:bg-trnet-surface/40">
                    <td className="max-w-md px-5 py-3 font-mono text-xs text-trnet-text">
                      {row.url}
                    </td>
                    <td className="px-5 py-3 font-semibold tabular-nums text-trnet-text">
                      {row.hit_count}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-trnet-text/60">
                      {formatDate(row.last_detected_at)}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setModalLink(row);
                          setTargetUrl("/");
                        }}
                        className="rounded-lg bg-trnet-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-trnet-breaking disabled:opacity-50"
                      >
                        Yönlendir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card mt-6 overflow-hidden sm:mt-8">
        <div className="border-b border-black/[0.06] bg-trnet-surface/80 px-4 py-4 sm:px-5">
          <h2 className="font-display text-lg font-semibold text-trnet-text sm:text-xl">
            Aktif Yönlendirmeler (301)
          </h2>
          <p className="mt-1 text-sm text-trnet-text/55">
            Middleware bu kuralları otomatik uygular.
          </p>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {redirects.length === 0 ? (
            <p className="py-6 text-center text-sm text-trnet-text/50">Henüz yönlendirme kuralı yok.</p>
          ) : (
            redirects.map((row) => (
              <article key={row.id} className="rounded-xl border border-black/[0.06] bg-white p-4">
                <p className="break-all font-mono text-xs text-trnet-text">{row.from_url}</p>
                <p className="my-2 flex items-center gap-2 text-trnet-text/40">
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="break-all font-mono text-xs text-trnet-primary">{row.to_url}</span>
                </p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onToggleRedirect(row.id, !row.is_active)}
                  className={`mb-3 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    row.is_active
                      ? "bg-emerald-500/10 text-emerald-700"
                      : "bg-amber-500/10 text-amber-800"
                  }`}
                >
                  {row.is_active ? "Aktif" : "Pasif"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onDeleteRedirect(row.id)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-trnet-breaking/30 px-5 py-3 text-sm font-semibold text-trnet-breaking disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Sil
                </button>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <th className="px-5 py-3 font-semibold text-trnet-text">Kaynak</th>
                <th className="px-5 py-3 font-semibold text-trnet-text" />
                <th className="px-5 py-3 font-semibold text-trnet-text">Hedef</th>
                <th className="px-5 py-3 font-semibold text-trnet-text">Durum</th>
                <th className="px-5 py-3 font-semibold text-trnet-text">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {redirects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-trnet-text/50">
                    Henüz yönlendirme kuralı yok.
                  </td>
                </tr>
              ) : (
                redirects.map((row) => (
                  <tr key={row.id} className="hover:bg-trnet-surface/40">
                    <td className="px-5 py-3 font-mono text-xs text-trnet-text">{row.from_url}</td>
                    <td className="px-2 py-3 text-trnet-text/40">
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-trnet-primary">{row.to_url}</td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onToggleRedirect(row.id, !row.is_active)}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.is_active
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-amber-500/10 text-amber-800"
                        }`}
                      >
                        {row.is_active ? "Aktif" : "Pasif"}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onDeleteRedirect(row.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-trnet-breaking/30 px-2.5 py-1.5 text-xs font-semibold text-trnet-breaking hover:bg-trnet-breaking/5 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalLink ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="redirect-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2
              id="redirect-modal-title"
              className="font-display text-xl font-semibold text-trnet-text"
            >
              301 Yönlendirme Oluştur
            </h2>
            <p className="mt-2 font-mono text-sm text-trnet-text/70">{modalLink.url}</p>
            <label className="mt-5 block text-sm font-semibold text-trnet-text" htmlFor="to_url">
              Yeni URL (hedef)
            </label>
            <input
              id="to_url"
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="/ veya /haber/yeni-slug"
              className="admin-input mt-1.5 w-full font-mono text-sm"
            />
            <p className="mt-2 text-xs text-trnet-text/50">
              Örnek: <span className="font-mono">/</span> veya{" "}
              <span className="font-mono">/haber/guncel-haber-slug</span>
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setModalLink(null)}
                disabled={pending}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="admin-btn-primary disabled:opacity-50"
                onClick={onSaveRedirect}
                disabled={pending}
              >
                Kaydet ve kuralı uygula
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
