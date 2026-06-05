import { NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { runNewsBotProcessJob } from "@/lib/bot/news-bot-process-job";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";
import { runAfterResponse } from "@/lib/runtime/run-after-response";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Haber botu başlatıcı — anında 202 döner (504 önlenir).
 * Asıl üretim aynı lambda'da waitUntil ile sürer (Deployment Protection HTTP zincirini engeller).
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

  runAfterResponse(async () => {
    try {
      const result = await runNewsBotProcessJob();
      console.info(
        `[news-bot] Arka plan process tamamlandı: saved=${result.saved ?? 0} deferred=${Boolean(result.deferred)}`,
        JSON.stringify(result).slice(0, 800),
      );
    } catch (err) {
      console.error("[news-bot] Arka plan process hatası:", err);
    }
  });

  return NextResponse.json(
    {
      ok: true,
      status: "started",
      engine: "queue-v3-waituntil",
      hint: "İşlem aynı lambda'da waitUntil ile sürüyor. Sonuç için Vercel Logs veya /api/cron/news-bot-process.",
    },
    { status: 202 },
  );
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
