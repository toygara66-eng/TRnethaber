import { runEarthquakeBotPipeline, type EarthquakeBotResult } from "@/lib/bot/earthquake-pipeline";
import {
  runNewsBotFetchPhase,
  runNewsBotProcessPhase,
  type NewsBotProcessPhaseResult,
} from "@/lib/bot/pipeline";

export type DarkFactoryResult =
  | { mode: "earthquake"; result: EarthquakeBotResult }
  | { mode: "news"; result: NewsBotProcessPhaseResult };

/**
 * Karanlık Fabrika ana girişi: önce deprem (>=4.0), yoksa RSS haber hattı.
 * Zırhlı Sürüm: Deprem servisi (AFAD) engellese/çökse bile fabrika durmaz, habere geçer.
 */
export async function runDarkFactory(): Promise<DarkFactoryResult> {
  // 1. Zırhlı Deprem Kontrolü
  try {
    const earthquake = await runEarthquakeBotPipeline();
    if (earthquake.triggered) {
      return { mode: "earthquake", result: earthquake };
    }
  } catch (error) {
    console.error("[news-bot] Deprem servisine ulaşılamadı, normal habere geçiliyor. Hata:", error);
  }

  // 2. Kuyruk tabanlı haber hattı
  await runNewsBotFetchPhase();
  const news = await runNewsBotProcessPhase();
  return { mode: "news", result: news };
}