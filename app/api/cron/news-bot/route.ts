import { NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { runNewsBotOrchestrator } from "@/lib/bot/news-bot-orchestrator";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";
import { runAfterResponse } from "@/lib/runtime/run-after-response";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * TRNETHABER Karanlık Fabrika — kuyruk tabanlı başlatıcı.
 * Yanıt hemen döner; fetch + process fazları waitUntil ile arka planda çalışır.
 * Ayrı cron: /api/cron/news-bot-fetch ve /api/cron/news-bot-process
 */
async function handleCron(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(cronUnauthorizedResponse(), { status: 401 });
  }

  const missing = getNewsBotEnvMissing();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Eksik ortam değişkenleri: ${missing.join(", ")}. Vercel Dashboard → Environment Variables`,
      },
      { status: 500 },
    );
  }

  runAfterResponse(() => runNewsBotOrchestrator());

  return NextResponse.json({ ok: true, status: "started" }, { status: 202 });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
