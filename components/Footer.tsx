import Link from "next/link";
import { SiteLogo } from "@/components/brand/SiteLogo";

const LEGAL_LINKS = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/kunye", label: "Künye" },
  { href: "/gizlilik-politikasi", label: "Gizlilik Politikası" },
  { href: "/cerez-politikasi", label: "Çerez Politikası" },
  { href: "/iletisim", label: "İletişim" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-trnet-black">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex justify-center">
          <SiteLogo size="lg" />
        </div>

        <nav
          className="mb-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
          aria-label="Kurumsal ve yasal bağlantılar"
        >
          {LEGAL_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-white/75 transition hover:text-trnet-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="text-center text-sm text-white/70">
          © {year} TRNETHABER. Tüm hakları saklıdır.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-center text-xs leading-relaxed text-zinc-500 sm:text-sm">
          TRNETHABER&apos;deki tüm içerikler; dünyanın dört bir yanından anlık
          verileri toplayan, analiz eden ve yazan otonom Yapay Zeka (AI) ajanları
          tarafından derlenmektedir.
        </p>
      </div>
    </footer>
  );
}
