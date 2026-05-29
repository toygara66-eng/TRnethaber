"use client";

import { useCallback, useEffect, useState } from "react";
import { Gamepad2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { GameClubItem } from "@/lib/data/games";
import { GAME_CLUB_ITEMS } from "@/lib/data/games";

function GameCard({
  game,
  onPlay,
}: {
  game: GameClubItem;
  onPlay: (game: GameClubItem) => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      onClick={() => onPlay(game)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-trnet-card p-5 text-left shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] transition-shadow hover:border-trnet-primary/30 hover:shadow-[0_22px_56px_rgba(229,9,20,0.12)]"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-trnet-black to-trnet-black/80 text-3xl shadow-inner ring-1 ring-white/10">
        <span aria-hidden>{game.emoji}</span>
      </div>
      <h2 className="font-display text-lg font-semibold text-trnet-text group-hover:text-trnet-primary">
        {game.title}
      </h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-trnet-text/60">{game.description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-trnet-primary">
        <Gamepad2 className="h-3.5 w-3.5" aria-hidden />
        Oyna
      </span>
    </motion.button>
  );
}

function GameModal({
  game,
  onClose,
}: {
  game: GameClubItem;
  onClose: () => void;
}) {
  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [handleKey]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-trnet-black/75 backdrop-blur-sm"
        aria-label="Oyun penceresini kapat"
        onClick={onClose}
      />

      <motion.div
        className="relative z-10 flex w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-trnet-black shadow-2xl sm:rounded-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-trnet-primary">
              Oyun Kulübü
            </p>
            <h2 id="game-modal-title" className="truncate font-display text-lg font-semibold text-white">
              <span className="mr-2" aria-hidden>
                {game.emoji}
              </span>
              {game.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white transition hover:border-trnet-primary hover:bg-trnet-primary/20 sm:px-4"
            aria-label="Kapat"
          >
            <span className="hidden sm:inline">Kapat</span>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="relative h-[80vh] w-full shrink-0 bg-gray-900 p-3 sm:p-4 md:h-[600px]">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/85 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:border-trnet-primary hover:bg-trnet-primary/90 sm:right-6 sm:top-6"
            aria-label="Oyundan çık ve kapat"
          >
            <span>Kapat</span>
            <X className="h-4 w-4" aria-hidden />
          </button>
          <iframe
            key={game.id}
            src={game.embedUrl}
            className="absolute left-0 top-0 h-full w-full rounded-xl border-0 bg-gray-900"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer"
            loading="lazy"
            title={game.title}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function GameClubClient() {
  const [selectedGame, setSelectedGame] = useState<GameClubItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_CLUB_ITEMS.map((game) => (
          <GameCard key={game.id} game={game} onPlay={setSelectedGame} />
        ))}
      </div>

      <AnimatePresence>
        {selectedGame ? (
          <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} />
        ) : null}
      </AnimatePresence>
    </>
  );
}
