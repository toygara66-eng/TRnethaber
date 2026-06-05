import { NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { runNewsBotFetchPhase } from "@/lib/bot/pipeline";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";
import {
  AI_TIMEOUT_DEFER_LOG,
  isAiTimeoutOrStallError,
  logAiTimeoutDefer,
} from "@/lib/bot/cron-graceful";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleCron(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(cronUnauthorizedResponse(), { status: 401 });
  }

  const missing = getNewsBotEnvMissing();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Eksik ortam değişkenleri: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  try {
    const result = await runNewsBotFetchPhase();

    if (result.deferred) {
      logAiTimeoutDefer("news-bot-fetch");
      return NextResponse.json(
        {
          ...result,
          ok: true,
          phase: "fetch",
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { ...result, ok: true, phase: "fetch" },
      { status: result.fetched > 0 ? 201 : 200 },
    );
  } catch (err) {
    if (isAiTimeoutOrStallError(err)) {
      logAiTimeoutDefer("news-bot-fetch");
      return NextResponse.json(
        {
          ok: true,
          phase: "fetch",
          deferred: true,
          reason: "ai_timeout",
          message: AI_TIMEOUT_DEFER_LOG,
        },
        { status: 200 },
      );
    }
    const message = err instanceof Error ? err.message : "Fetch fazı başarısız";
    console.error("[news-bot-fetch]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
