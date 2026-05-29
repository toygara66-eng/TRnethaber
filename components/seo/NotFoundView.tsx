import Link from "next/link";
import { BrokenLinkLogger } from "@/components/seo/BrokenLinkLogger";

type Props = {
  title?: string;
  description?: string;
  showAutoRedirect?: boolean;
  children?: React.ReactNode;
};

export function NotFoundView({
  title = "Aradığınız sayfa bulunamadı",
  description = "Bağlantı kırık, taşınmış veya hiç var olmamış olabilir. Ana sayfadan güncel haberlere dönebilirsiniz.",
  showAutoRedirect = false,
  children,
}: Props) {
  return (
    <>
      <BrokenLinkLogger />
      <main className="flex min-h-dvh flex-col items-center justify-center bg-trnet-surface px-4 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-trnet-primary">
          404 · TRNETHABER
        </p>
        <h1 className="mt-4 max-w-xl font-display text-3xl font-semibold text-trnet-text sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-trnet-text/70 sm:text-base">
          {description}
        </p>

        {children}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex rounded-full bg-trnet-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-trnet-breaking"
          >
            Ana sayfaya dön
          </Link>
          {showAutoRedirect ? (
            <p className="w-full text-xs text-trnet-text/45">
              Kısa süre içinde ana sayfaya yönlendirileceksiniz…
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
