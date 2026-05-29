import { SiteLogo } from "@/components/brand/SiteLogo";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-trnet-black">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex justify-center">
          <SiteLogo size="lg" />
        </div>
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
