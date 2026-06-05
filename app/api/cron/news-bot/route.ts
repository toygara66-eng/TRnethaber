import { NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { invokeCronRoute } from "@/lib/bot/invoke-cron-route";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";
import { runAfterResponse } from "@/lib/runtime/run-after-response";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Haber botu başlatıcı — anında 202 döner (504 önlenir).
 * Asıl üretim ayrı lambda'da /api/cron/news-bot-process üzerinden çalışır.
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
      const res = await invokeCronRoute("/api/cron/news-bot-process");
      const body = await res.text();
      console.info(
        `[news-bot] Zincir process tamamlandı: HTTP ${res.status}`,
        body.slice(0, 600),
      );
    } catch (err) {
      console.error("[news-bot] Zincir process hatası:", err);
    }
  });

  return NextResponse.json(
    {
      ok: true,
      status: "started",
      engine: "queue-v3-chain",
      hint: "İşlem /api/cron/news-bot-process üzerinde ayrı lambda'da sürüyor. Sonuç için Vercel Logs veya process endpoint'ine bakın.",
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
