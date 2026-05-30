import { runEntityBotForArticle } from "@/lib/bot/entity-bot";
import { findPublishableEarthquake } from "@/lib/bot/earthquake-monitor";
import { persistSynthesizedArticle } from "@/lib/bot/persist";
import { GEMINI_BUSY_USER_MESSAGE, isGeminiBusyError, logGeminiBusy } from "@/lib/bot/gemini-client";
import { synthesizeFromWire } from "@/lib/bot/synthesizer";
import type { EntityUpsertResult } from "@/lib/bot/types";

export type EarthquakeBotResult =
  | {
      ok: true;
      triggered: true;
      eventId: string;
      magnitude: number;
      location: string;
      article: {
        id: string;
        slug: string;
        title: string;
        spot_metni: string;
        is_breaking: boolean;
      };
      entities: EntityUpsertResult[];
    }
  | {
      ok: true;
      triggered: false;
      message: string;
    };

export async function runEarthquakeBotPipeline(): Promise<EarthquakeBotResult> {
  const candidate = await findPublishableEarthquake();

  if (!candidate) {
    return {
      ok: true,
      triggered: false,
      message: "Yayınlanacak yeni deprem (eşik üstü) bulunamadı.",
    };
  }

  const { event, wire } = candidate;

  let synthesized;
  try {
    synthesized = await synthesizeFromWire(wire);
  } catch (err) {
    if (isGeminiBusyError(err)) {
      logGeminiBusy(err);
      return {
        ok: true,
        triggered: false,
        message: GEMINI_BUSY_USER_MESSAGE,
      };
    }
    throw err;
  }

  const saved = await persistSynthesizedArticle(synthesized, wire.sourceUrl);

  const entities = await runEntityBotForArticle({
    title: synthesized.title,
    spot: synthesized.spot_metni,
    content: synthesized.content,
    articleSlug: saved.slug,
  });

  return {
    ok: true,
    triggered: true,
    eventId: event.eventID,
    magnitude: event.magnitude,
    location: event.location,
    article: {
      id: saved.id,
      slug: saved.slug,
      title: synthesized.title,
      spot_metni: synthesized.spot_metni,
      is_breaking: true,
    },
    entities,
  };
}
