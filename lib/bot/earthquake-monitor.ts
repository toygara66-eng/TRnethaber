import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AgencyWire } from "@/lib/bot/types";

export type AfadEarthquakeEvent = {
  eventID: string;
  location: string;
  magnitude: number;
  depth: number;
  date: string;
  province?: string;
  district?: string;
  latitude: string;
  longitude: string;
};

const AFAD_FILTER_URL = "https://deprem.afad.gov.tr/apiv2/event/filter";
const DEFAULT_MIN_MAGNITUDE = 4.0;
const LOOKBACK_HOURS = 6;

function parseMagnitude(value: string | number): number {
  if (typeof value === "number") return value;
  return parseFloat(String(value).replace(",", ".")) || 0;
}

function magnitudeToWords(mag: number): string {
  const str = mag.toFixed(1).replace(".", " virgül ");
  return str;
}

function depthToWords(depth: number): string {
  const rounded = Math.round(depth);
  return `${rounded} kilometre derinlik`;
}

export function getEarthquakeMinMagnitude(): number {
  const env = process.env.EARTHQUAKE_MIN_MAGNITUDE?.trim();
  if (!env) return DEFAULT_MIN_MAGNITUDE;
  const parsed = parseFloat(env);
  return Number.isFinite(parsed) ? parsed : DEFAULT_MIN_MAGNITUDE;
}

export async function fetchRecentAfadEvents(): Promise<AfadEarthquakeEvent[]> {
  const end = new Date();
  const start = new Date(end.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);

  const params = new URLSearchParams({
    start: start.toISOString().slice(0, 19),
    end: end.toISOString().slice(0, 19),
    limit: "100",
    orderby: "timedesc",
  });

  const res = await fetch(`${AFAD_FILTER_URL}?${params}`, {
    headers: { "User-Agent": "TRNETHABER-Bot/1.0" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`AFAD API hatası: ${res.status}`);
  }

  const data = (await res.json()) as Array<Record<string, string>>;
  if (!Array.isArray(data)) return [];

  return data.map((row) => ({
    eventID: String(row.eventID ?? ""),
    location: String(row.location ?? "Bilinmeyen konum"),
    magnitude: parseMagnitude(row.magnitude ?? "0"),
    depth: parseMagnitude(row.depth ?? "0"),
    date: String(row.date ?? ""),
    province: row.province,
    district: row.district,
    latitude: String(row.latitude ?? ""),
    longitude: String(row.longitude ?? ""),
  }));
}

function afadSourceUrl(eventId: string): string {
  return `https://deprem.afad.gov.tr/event/${eventId}`;
}

async function isEarthquakeAlreadyPublished(eventId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const url = afadSourceUrl(eventId);
  const { data } = await supabase
    .from("articles")
    .select("id")
    .eq("source_url", url)
    .maybeSingle();
  return Boolean(data);
}

export function earthquakeToWire(event: AfadEarthquakeEvent): AgencyWire {
  const magWords = magnitudeToWords(event.magnitude);
  const depthWords = depthToWords(event.depth);
  const place = event.location || event.province || "Türkiye";

  return {
    id: `afad-${event.eventID}`,
    categorySlug: "gundem",
    isBreaking: true,
    rawTitle: `SON DAKİKA: ${place} bölgesinde ${magWords} büyüklüğünde deprem`,
    rawLead: `AFAD verilerine göre ${place} bölgesinde saat ${event.date} itibarıyla ${magWords} büyüklüğünde sarsıntı kaydedildi.`,
    rawBody: [
      `Konum: ${place}.`,
      `Büyüklük: ${magWords}.`,
      `Derinlik: ${depthWords}.`,
      `Koordinat: enlem ${event.latitude}, boylam ${event.longitude}.`,
      `Kaynak: AFAD Deprem API. Olay numarası ${event.eventID}.`,
      "Resmi kurumlar ek bilgi paylaşana kadar gelişmeler takip edilecek.",
    ].join("\n\n"),
    sourceLabel: "AFAD Deprem Verisi",
    sourceUrl: afadSourceUrl(event.eventID),
  };
}

/**
 * Son saatlerdeki en güçlü (>= min magnitude) ve henüz yayınlanmamış depremi döner.
 */
export async function findPublishableEarthquake(): Promise<{
  event: AfadEarthquakeEvent;
  wire: AgencyWire;
} | null> {
  const minMag = getEarthquakeMinMagnitude();
  const events = await fetchRecentAfadEvents();

  const candidates = events
    .filter((e) => e.eventID && e.magnitude >= minMag)
    .sort((a, b) => b.magnitude - a.magnitude);

  for (const event of candidates) {
    const published = await isEarthquakeAlreadyPublished(event.eventID);
    if (published) continue;
    return { event, wire: earthquakeToWire(event) };
  }

  return null;
}
