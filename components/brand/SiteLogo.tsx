import Link from "next/link";
import { brandLogoClassName } from "@/lib/fonts/brand-logo";

type SiteLogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
};

const sizeClasses: Record<NonNullable<SiteLogoProps["size"]>, string> = {
  sm: "text-2xl sm:text-3xl",
  md: "text-3xl sm:text-4xl",
  lg: "text-[1.75rem] sm:text-4xl",
};

export function SiteLogo({
  href = "/",
  size = "md",
  showTagline = false,
  className = "",
}: SiteLogoProps) {
  const mark = (
    <>
      <span
        className={`trnet-brand-logo whitespace-nowrap ${brandLogoClassName} ${sizeClasses[size]}`}
      >
        <span className="text-white">TRNET</span>
        <span className="text-trnet-primary transition-colors group-hover:text-white">
          HABER
        </span>
      </span>
      {showTagline ? (
        <span className="mt-1 font-sans text-[11px] font-medium leading-none tracking-[0.04em] text-white/55 sm:text-xs">
          Türkiye&apos;nin Net Haber Ağı
        </span>
      ) : null}
    </>
  );

  const base = `group inline-flex flex-col items-center leading-none ${className}`;

  return (
    <Link href={href} className={base} aria-label="TRNETHABER anasayfa">
      {mark}
    </Link>
  );
}
