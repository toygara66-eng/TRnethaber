import { ImageOff } from "lucide-react";

type Props = {
  className?: string;
  variant?: "dark" | "card";
};

export function ImageFallback({ className = "", variant = "dark" }: Props) {
  const isCard = variant === "card";

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#141414] via-[#1a1a1a] to-[#232323] ${className}`}
      role="img"
      aria-label="Görsel yüklenemedi"
    >
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border ${
          isCard
            ? "border-black/10 bg-trnet-surface/80 px-6 py-5"
            : "border-white/10 bg-black/30 px-8 py-6 backdrop-blur-sm"
        }`}
      >
        <ImageOff
          className={`mb-3 shrink-0 ${isCard ? "h-8 w-8 text-trnet-text/35" : "h-10 w-10 text-white/40"}`}
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="font-display text-lg font-semibold tracking-[0.14em]">
          <span className={isCard ? "text-trnet-text" : "text-white"}>TRNET</span>
          <span className="text-trnet-primary">HABER</span>
        </p>
      </div>
    </div>
  );
}
