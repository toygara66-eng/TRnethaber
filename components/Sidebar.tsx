"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, MapPin, Trophy } from "lucide-react";
import { TURKIYE_ILLER } from "@/lib/data/turkiye-iller";

type StandingRow = {
  rank: number;
  team: string;
  played: number;
  points: number;
};

type LeagueOption = {
  id: string;
  label: string;
};

const LEAGUE_OPTIONS: LeagueOption[] = [
  { id: "super-lig", label: "Trendyol Süper Lig" },
  { id: "trendyol-1", label: "Trendyol 1. Lig" },
  { id: "tff-2-beyaz", label: "TFF 2. Lig (Beyaz Grup)" },
  { id: "tff-2-kirmizi", label: "TFF 2. Lig (Kırmızı Grup)" },
  { id: "tff-3-1", label: "TFF 3. Lig (1. Grup)" },
  { id: "tff-3-2", label: "TFF 3. Lig (2. Grup)" },
  { id: "tff-3-3", label: "TFF 3. Lig (3. Grup)" },
  { id: "tff-3-4", label: "TFF 3. Lig (4. Grup)" },
];

const LEAGUE_STANDINGS: Record<string, StandingRow[]> = {
  "super-lig": [
    { rank: 1, team: "Galatasaray", played: 28, points: 72 },
    { rank: 2, team: "Fenerbahçe", played: 28, points: 68 },
    { rank: 3, team: "Trabzonspor", played: 28, points: 61 },
    { rank: 4, team: "Beşiktaş", played: 28, points: 58 },
    { rank: 5, team: "Başakşehir", played: 28, points: 52 },
    { rank: 6, team: "Kasımpaşa", played: 28, points: 48 },
    { rank: 7, team: "Antalyaspor", played: 28, points: 45 },
    { rank: 8, team: "Sivasspor", played: 28, points: 42 },
    { rank: 9, team: "Konyaspor", played: 28, points: 40 },
    { rank: 10, team: "Alanyaspor", played: 28, points: 38 },
    { rank: 11, team: "Gaziantep FK", played: 28, points: 36 },
    { rank: 12, team: "Rizespor", played: 28, points: 34 },
    { rank: 13, team: "Kayserispor", played: 28, points: 32 },
    { rank: 14, team: "Hatayspor", played: 28, points: 30 },
    { rank: 15, team: "Adana Demirspor", played: 28, points: 28 },
    { rank: 16, team: "Samsunspor", played: 28, points: 26 },
    { rank: 17, team: "Ankaragücü", played: 28, points: 24 },
    { rank: 18, team: "İstanbulspor", played: 28, points: 20 },
  ],
  "trendyol-1": [
    { rank: 1, team: "Eyüpspor", played: 30, points: 62 },
    { rank: 2, team: "Göztepe", played: 30, points: 59 },
    { rank: 3, team: "Çorum FK", played: 30, points: 55 },
    { rank: 4, team: "Sakaryaspor", played: 30, points: 53 },
    { rank: 5, team: "Bandırmaspor", played: 30, points: 51 },
    { rank: 6, team: "Gençlerbirliği", played: 30, points: 48 },
    { rank: 7, team: "Boluspor", played: 30, points: 46 },
    { rank: 8, team: "Kocaelispor", played: 30, points: 44 },
    { rank: 9, team: "Ümraniyespor", played: 30, points: 42 },
    { rank: 10, team: "Manisa FK", played: 30, points: 40 },
    { rank: 11, team: "Tuzlaspor", played: 30, points: 38 },
    { rank: 12, team: "Giresunspor", played: 30, points: 36 },
    { rank: 13, team: "Altınordu", played: 30, points: 34 },
    { rank: 14, team: "Yeni Malatyaspor", played: 30, points: 32 },
    { rank: 15, team: "Adanaspor", played: 30, points: 30 },
    { rank: 16, team: "Denizlispor", played: 30, points: 28 },
    { rank: 17, team: "Gazişehir Gaziantep", played: 30, points: 26 },
    { rank: 18, team: "Pendikspor", played: 30, points: 22 },
  ],
  "tff-2-beyaz": [
    { rank: 1, team: "Sarıyer", played: 28, points: 58 },
    { rank: 2, team: "Ankara Keçiörengücü", played: 28, points: 55 },
    { rank: 3, team: "Vanspor FK", played: 28, points: 52 },
    { rank: 4, team: "Amed SK", played: 28, points: 50 },
    { rank: 5, team: "Şanlıurfaspor", played: 28, points: 47 },
    { rank: 6, team: "Kırklarelispor", played: 28, points: 45 },
    { rank: 7, team: "Fethiyespor", played: 28, points: 43 },
    { rank: 8, team: "Karşıyaka", played: 28, points: 41 },
    { rank: 9, team: "Hekimoğlu Trabzon", played: 28, points: 39 },
    { rank: 10, team: "Menemen FK", played: 28, points: 37 },
    { rank: 11, team: "Kastamonuspor", played: 28, points: 35 },
    { rank: 12, team: "Ankaraspor", played: 28, points: 33 },
    { rank: 13, team: "Nazilli Belediyespor", played: 28, points: 31 },
    { rank: 14, team: "İskenderunspor", played: 28, points: 29 },
    { rank: 15, team: "Muğlaspor", played: 28, points: 27 },
    { rank: 16, team: "Kırşehir Belediyespor", played: 28, points: 25 },
    { rank: 17, team: "Turgutluspor", played: 28, points: 22 },
    { rank: 18, team: "Pazarspor", played: 28, points: 18 },
  ],
  "tff-2-kirmizi": [
    { rank: 1, team: "Bodrum FK", played: 28, points: 60 },
    { rank: 2, team: "Ümraniyespor", played: 28, points: 56 },
    { rank: 3, team: "Iğdır FK", played: 28, points: 54 },
    { rank: 4, team: "Aliağa FK", played: 28, points: 51 },
    { rank: 5, team: "Kahramanmaraş İstiklalspor", played: 28, points: 49 },
    { rank: 6, team: "Adana 01 FK", played: 28, points: 46 },
    { rank: 7, team: "Batman Petrolspor", played: 28, points: 44 },
    { rank: 8, team: "Karaman FK", played: 28, points: 42 },
    { rank: 9, team: "Muş SK", played: 28, points: 40 },
    { rank: 10, team: "Kırıkkale FK", played: 28, points: 38 },
    { rank: 11, team: "Düzcespor", played: 28, points: 36 },
    { rank: 12, team: "Elazığspor", played: 28, points: 34 },
    { rank: 13, team: "Kırşehir FK", played: 28, points: 32 },
    { rank: 14, team: "Yeni Çorumspor", played: 28, points: 30 },
    { rank: 15, team: "Osmaniyespor FK", played: 28, points: 28 },
    { rank: 16, team: "Malatya Yeşilyurtspor", played: 28, points: 26 },
    { rank: 17, team: "Kastamonuspor 1966", played: 28, points: 23 },
    { rank: 18, team: "Balıkesirspor", played: 28, points: 19 },
  ],
  "tff-3-1": [
    { rank: 1, team: "Bursaspor", played: 26, points: 54 },
    { rank: 2, team: "24 Erzincanspor", played: 26, points: 51 },
    { rank: 3, team: "Kırklarelispor", played: 26, points: 48 },
    { rank: 4, team: "Altınordu", played: 26, points: 46 },
    { rank: 5, team: "Muğlaspor", played: 26, points: 44 },
    { rank: 6, team: "Manisa BBSK", played: 26, points: 42 },
    { rank: 7, team: "Kastamonuspor", played: 26, points: 40 },
    { rank: 8, team: "Somaspor", played: 26, points: 38 },
    { rank: 9, team: "Edirnespor", played: 26, points: 36 },
    { rank: 10, team: "Çatalcaspor", played: 26, points: 34 },
    { rank: 11, team: "Silivrispor", played: 26, points: 32 },
    { rank: 12, team: "Tekirdağspor", played: 26, points: 30 },
    { rank: 13, team: "Çorluspor", played: 26, points: 28 },
    { rank: 14, team: "Kırklarelispor", played: 26, points: 26 },
    { rank: 15, team: "Babaeski FK", played: 26, points: 24 },
    { rank: 16, team: "Lüleburgaspor", played: 26, points: 20 },
  ],
  "tff-3-2": [
    { rank: 1, team: "Ankaragücü", played: 26, points: 55 },
    { rank: 2, team: "Keçiörengücü", played: 26, points: 52 },
    { rank: 3, team: "Sarıyer", played: 26, points: 49 },
    { rank: 4, team: "Etimesgut Belediyespor", played: 26, points: 47 },
    { rank: 5, team: "Ankara Demirspor", played: 26, points: 45 },
    { rank: 6, team: "Kırıkkale FK", played: 26, points: 43 },
    { rank: 7, team: "Kastamonuspor", played: 26, points: 41 },
    { rank: 8, team: "Çankaya FK", played: 26, points: 39 },
    { rank: 9, team: "Polatlı 1926 SK", played: 26, points: 37 },
    { rank: 10, team: "Beyoğlu Yeni Çarşı", played: 26, points: 35 },
    { rank: 11, team: "Kırşehir FK", played: 26, points: 33 },
    { rank: 12, team: "Nevşehir Belediyespor", played: 26, points: 31 },
    { rank: 13, team: "Afyonspor", played: 26, points: 29 },
    { rank: 14, team: "Uşakspor", played: 26, points: 27 },
    { rank: 15, team: "Kütahyaspor", played: 26, points: 25 },
    { rank: 16, team: "Düzcespor", played: 26, points: 21 },
  ],
  "tff-3-3": [
    { rank: 1, team: "İskenderunspor", played: 26, points: 53 },
    { rank: 2, team: "Kahramanmaraşspor", played: 26, points: 50 },
    { rank: 3, team: "Adanaspor", played: 26, points: 48 },
    { rank: 4, team: "Hatayspor", played: 26, points: 46 },
    { rank: 5, team: "Osmaniyespor", played: 26, points: 44 },
    { rank: 6, team: "Tarsus İdman Yurdu", played: 26, points: 42 },
    { rank: 7, team: "Silifke Belediyespor", played: 26, points: 40 },
    { rank: 8, team: "Erdemli Belediyespor", played: 26, points: 38 },
    { rank: 9, team: "Kırklarelispor", played: 26, points: 36 },
    { rank: 10, team: "Alanya Kestelspor", played: 26, points: 34 },
    { rank: 11, team: "Manavgat Belediyespor", played: 26, points: 32 },
    { rank: 12, team: "Serik Belediyespor", played: 26, points: 30 },
    { rank: 13, team: "Karaman FK", played: 26, points: 28 },
    { rank: 14, team: "Niğde Belediyespor", played: 26, points: 26 },
    { rank: 15, team: "Aksaray Belediyespor", played: 26, points: 24 },
    { rank: 16, team: "Kırşehir Belediyespor", played: 26, points: 19 },
  ],
  "tff-3-4": [
    { rank: 1, team: "Bursa Yıldırımspor", played: 26, points: 52 },
    { rank: 2, team: "Sakaryaspor", played: 26, points: 49 },
    { rank: 3, team: "Kocaelispor", played: 26, points: 47 },
    { rank: 4, team: "Gebzespor", played: 26, points: 45 },
    { rank: 5, team: "Düzcespor", played: 26, points: 43 },
    { rank: 6, team: "Zonguldak Kömürspor", played: 26, points: 41 },
    { rank: 7, team: "Bartınspor", played: 26, points: 39 },
    { rank: 8, team: "Karabük İdman Yurdu", played: 26, points: 37 },
    { rank: 9, team: "Çayelispor", played: 26, points: 35 },
    { rank: 10, team: "Rizespor", played: 26, points: 33 },
    { rank: 11, team: "Artvin Hopaspor", played: 26, points: 31 },
    { rank: 12, team: "Giresunspor", played: 26, points: 29 },
    { rank: 13, team: "Ordu Pazarspor", played: 26, points: 27 },
    { rank: 14, team: "Trabzon FK", played: 26, points: 25 },
    { rank: 15, team: "Bayburt Özel İdarespor", played: 26, points: 23 },
    { rank: 16, team: "Erzurumspor FK", played: 26, points: 18 },
  ],
};

const DEFAULT_PROVINCE =
  TURKIYE_ILLER.find((il) => il.name === "İstanbul") ?? TURKIYE_ILLER[0];

const WEATHER_DESCRIPTIONS = [
  "Açık",
  "Parçalı bulutlu",
  "Güneşli",
  "Kapalı",
  "Hafif yağışlı",
  "Rüzgarlı",
] as const;

const PRAYER_NAMES = ["İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"] as const;
const PRAYER_BASE_MINUTES = [282, 368, 785, 988, 1152, 1234] as const;

function hashText(value: string): number {
  return value.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function mockWeatherForProvince(name: string) {
  const seed = hashText(name);
  return {
    temp: `${8 + (seed % 22)}°C`,
    desc: WEATHER_DESCRIPTIONS[seed % WEATHER_DESCRIPTIONS.length],
  };
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function mockPrayerTimesForProvince(name: string) {
  const shift = (hashText(name) % 37) - 18;
  return PRAYER_NAMES.map((label, index) => ({
    name: label,
    time: formatMinutes(PRAYER_BASE_MINUTES[index] + shift),
  }));
}

function getStandings(leagueId: string): StandingRow[] {
  return LEAGUE_STANDINGS[leagueId] ?? LEAGUE_STANDINGS["super-lig"];
}

function rowAccent(rank: number, total: number): string {
  if (rank <= 2) return "border-l-2 border-l-emerald-500/80 bg-emerald-500/[0.06]";
  if (rank > total - 3) return "border-l-2 border-l-red-500/75 bg-red-500/[0.05]";
  return "border-l-2 border-l-transparent";
}

function DarkWidget({
  title,
  children,
  icon,
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-trnet-black shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
      <header className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        {icon}
        <h2 className="font-display text-sm font-semibold tracking-wide text-white">
          {title}
        </h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function DarkSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-white/12 bg-white/[0.04] py-3 pl-4 pr-10 text-sm font-medium text-white outline-none transition focus:border-trnet-primary/50 focus:ring-2 focus:ring-trnet-primary/20"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-trnet-black text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
          aria-hidden
        />
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [provinceSlug, setProvinceSlug] = useState(DEFAULT_PROVINCE.slug);
  const [leagueId, setLeagueId] = useState(LEAGUE_OPTIONS[0].id);

  const province = useMemo(
    () => TURKIYE_ILLER.find((il) => il.slug === provinceSlug) ?? DEFAULT_PROVINCE,
    [provinceSlug],
  );

  const weather = useMemo(() => mockWeatherForProvince(province.name), [province.name]);
  const prayerTimes = useMemo(
    () => mockPrayerTimesForProvince(province.name),
    [province.name],
  );

  const standings = useMemo(() => getStandings(leagueId), [leagueId]);
  const selectedLeague = LEAGUE_OPTIONS.find((l) => l.id === leagueId) ?? LEAGUE_OPTIONS[0];

  return (
    <aside
      className="hidden w-full shrink-0 lg:block lg:w-80 xl:w-[22rem]"
      aria-label="Şehir ve spor portalı"
    >
      <div className="sticky top-24 space-y-5">
        <div className="rounded-2xl border border-white/10 bg-trnet-black p-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          <DarkSelect
            id="sidebar-province"
            label="İl seçin"
            value={provinceSlug}
            onChange={setProvinceSlug}
            options={TURKIYE_ILLER.map((il) => ({ value: il.slug, label: il.name }))}
          />
        </div>

        <DarkWidget title="Hava Durumu" icon={<MapPin className="h-4 w-4 text-trnet-primary" />}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
            {province.name}
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="font-display text-3xl font-semibold tabular-nums text-white">
              {weather.temp}
            </p>
            <p className="text-right text-sm text-white/65">{weather.desc}</p>
          </div>
        </DarkWidget>

        <DarkWidget title="Namaz Vakitleri">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-white/40">
            {province.name} · bugün
          </p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            {prayerTimes.map((row) => (
              <li key={row.name} className="flex justify-between gap-2">
                <span className="text-white/55">{row.name}</span>
                <span className="font-semibold tabular-nums text-white">{row.time}</span>
              </li>
            ))}
          </ul>
        </DarkWidget>

        <DarkWidget
          title="Puan Durumu"
          icon={<Trophy className="h-4 w-4 text-trnet-primary" />}
        >
          <DarkSelect
            id="sidebar-league"
            label="Lig / grup"
            value={leagueId}
            onChange={setLeagueId}
            options={LEAGUE_OPTIONS.map((l) => ({ value: l.id, label: l.label }))}
          />

          <p className="mt-3 text-[11px] text-white/40">{selectedLeague.label}</p>

          <div className="mt-3 max-h-72 overflow-y-auto overscroll-contain scroll-smooth [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-trnet-black text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <tr>
                  <th className="pb-2 pr-2">Sıra</th>
                  <th className="pb-2 pr-2">Takım</th>
                  <th className="pb-2 pr-2 text-center">O</th>
                  <th className="pb-2 text-center">P</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {standings.map((row) => (
                  <tr
                    key={`${leagueId}-${row.rank}-${row.team}`}
                    className={`${rowAccent(row.rank, standings.length)} transition-colors hover:bg-white/[0.04]`}
                  >
                    <td className="py-2 pr-2 font-bold tabular-nums text-white/80">
                      {row.rank}
                    </td>
                    <td className="max-w-[8.5rem] truncate py-2 pr-2 font-medium text-white">
                      {row.team}
                    </td>
                    <td className="py-2 pr-2 text-center tabular-nums text-white/60">
                      {row.played}
                    </td>
                    <td className="py-2 text-center font-semibold tabular-nums text-trnet-primary">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex gap-4 text-[10px] text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 rounded bg-emerald-500" />
              Üst sıra
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 rounded bg-red-500" />
              Alt sıra
            </span>
          </div>
        </DarkWidget>
      </div>
    </aside>
  );
}
