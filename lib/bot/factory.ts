import { runEarthquakeBotPipeline, type EarthquakeBotResult } from "@/lib/bot/earthquake-pipeline";
import { runNewsBotPipeline, type NewsBotPipelineResult } from "@/lib/bot/pipeline";

export type DarkFactoryResult =
  | { mode: "earthquake"; result: EarthquakeBotResult }
  | { mode: "news"; result: NewsBotPipelineResult };

/**
 * Karanlık Fabrika ana girişi: önce deprem (>=4.0), yoksa RSS haber hattı.
 */
export async function runDarkFactory(): Promise<DarkFactoryResult> {
  const earthquake = await runEarthquakeBotPipeline();

  if (earthquake.triggered) {
    return { mode: "earthquake", result: earthquake };
  }

  const news = await runNewsBotPipeline();
  return { mode: "news", result: news };
}
