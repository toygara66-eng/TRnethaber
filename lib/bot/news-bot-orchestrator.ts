import { runEarthquakeBotPipeline } from "@/lib/bot/earthquake-pipeline";
import {
  runNewsBotFetchPhase,
  runNewsBotProcessPhase,
} from "@/lib/bot/pipeline";

/**
 * Arka plan orkestratörü — deprem kontrolü, ardından fetch → process kuyruk fazları.
 */
export async function runNewsBotOrchestrator(): Promise<void> {
  try {
    const earthquake = await runEarthquakeBotPipeline();
    if (earthquake.triggered) {
      console.info("[news-bot] Deprem haberi üretildi:", earthquake.article?.slug);
      return;
    }
  } catch (err) {
    console.error("[news-bot] Deprem kontrolü başarısız, kuyruğa geçiliyor:", err);
  }

  const fetchResult = await runNewsBotFetchPhase();
  console.info("[news-bot] Fetch fazı:", fetchResult);

  const processResult = await runNewsBotProcessPhase();
  console.info("[news-bot] Process fazı:", processResult);
}
