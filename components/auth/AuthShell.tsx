import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="min-h-dvh bg-trnet-black">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <Link
          href="/"
          className="mb-8 text-center font-display text-3xl tracking-[0.08em] text-white"
        >
          <span>TRNET</span>
          <span className="text-trnet-primary">HABER</span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-trnet-black/80 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-sm">
          <h1 className="font-display text-2xl font-semibold text-white">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-white/55">{subtitle}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer ? <div className="mt-6 text-center text-sm text-white/50">{footer}</div> : null}
      </div>
    </div>
  );
}
