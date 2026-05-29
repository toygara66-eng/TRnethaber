import type { Metadata } from "next";
import { GameClubClient } from "@/components/games/GameClubClient";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "TRNETHABER Oyun Kulübü",
  description:
    "HexGL, Stockfish satranç, sudoku, tetris ve daha fazlası — açık kaynak oyunlarla haber arası molanı ver.",
  alternates: { canonical: absoluteUrl("/oyunlar") },
};

export default function GamesPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-10 max-w-2xl">
        <p className="mb-2 inline-flex items-center rounded-full border border-trnet-primary/20 bg-trnet-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-trnet-primary">
          Eğlence
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-trnet-text sm:text-4xl">
          TRNETHABER Oyun Kulübü
        </h1>
        <p className="mt-3 text-base leading-relaxed text-trnet-text/65 sm:text-lg">
          Haberleri okuduktan sonra siteden ayrılmadan kısa bir mola ver. Oyunlar bu sayfada açılır;
          yeni sekme açılmaz.
        </p>
      </header>

      <GameClubClient />
    </main>
  );
}
