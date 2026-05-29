/** TRNETHABER Oyun Kulübü — test edilmiş, iframe-dostu açık kaynak oyunlar */

export type GameClubItem = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  embedUrl: string;
};

export const GAME_CLUB_ITEMS: GameClubItem[] = [
  {
    id: "hexgl",
    title: "HexGL",
    description: "3D fütüristik yarış — hız, refleks ve neon pistler.",
    emoji: "🏎️",
    embedUrl: "https://hexgl.bkcore.com/play/",
  },
  {
    id: "satranc",
    title: "Modern Satranç",
    description: "Stockfish AI — klasik satranç, güçlü rakip.",
    emoji: "♟️",
    embedUrl: "https://drfperez.github.io/chess/stockfish/",
  },
  {
    id: "sudoku",
    title: "Klasik Sudoku",
    description: "Zeka bulmacası — rakamları doğru yerleştir.",
    emoji: "🔢",
    embedUrl: "https://gjoranf.github.io/sudoku",
  },
  {
    id: "react-tetris",
    title: "React Tetris",
    description: "Modern arayüzlü tetris — satırları tamamla.",
    emoji: "🟦",
    embedUrl: "https://chvin.github.io/react-tetris/?lan=en",
  },
  {
    id: "pac-man",
    title: "Pac-Man",
    description: "Efsane klasik — noktaları topla, hayaletlerden kaç.",
    emoji: "👾",
    embedUrl: "https://pacman.platzh1rsch.ch/",
  },
  {
    id: "hextris",
    title: "Hextris",
    description: "Tetris'in altıgen hali — hızlı refleks oyunu.",
    emoji: "⬡",
    embedUrl: "https://hextris.io/",
  },
];
