/** Trendyol Süper Lig — profil takım seçimi */
export const SUPER_LIG_TEAMS = [
  "Galatasaray",
  "Fenerbahçe",
  "Trabzonspor",
  "Beşiktaş",
  "Başakşehir",
  "Kasımpaşa",
  "Antalyaspor",
  "Sivasspor",
  "Konyaspor",
  "Alanyaspor",
  "Gaziantep FK",
  "Rizespor",
  "Kayserispor",
  "Hatayspor",
  "Adana Demirspor",
  "Samsunspor",
  "Ankaragücü",
  "İstanbulspor",
] as const;

/** 1. Lig ve alt kademe — yerel / alt lig tercihi */
export const LOWER_LEAGUE_TEAMS = [
  "Eyüpspor",
  "Göztepe",
  "Çorum FK",
  "Sakaryaspor",
  "Bandırmaspor",
  "Gençlerbirliği",
  "Boluspor",
  "Kocaelispor",
  "Ümraniyespor",
  "Manisa FK",
  "Bursaspor",
  "Sarıyer",
  "Karşıyaka",
  "Bodrum FK",
  "Denizlispor",
  "Adanaspor",
  "Altınordu",
  "Giresunspor",
  "Elazığspor",
  "Düzcespor",
  "Vanspor FK",
  "Amed SK",
  "Fethiyespor",
  "Kahramanmaraşspor",
  "Osmaniyespor",
  "Erzurumspor FK",
  "Zonguldak Kömürspor",
  "Artvin Hopaspor",
] as const;

const superLigSet = new Set<string>(SUPER_LIG_TEAMS);

export const FAVORITE_TEAM_OPTIONS: string[] = [
  ...SUPER_LIG_TEAMS,
  ...LOWER_LEAGUE_TEAMS.filter((t) => !superLigSet.has(t)),
].sort((a, b) => a.localeCompare(b, "tr"));

export function isValidFavoriteTeam(team: string): boolean {
  const normalized = team.trim().toLocaleLowerCase("tr");
  return FAVORITE_TEAM_OPTIONS.some(
    (t) => t.toLocaleLowerCase("tr") === normalized,
  );
}
