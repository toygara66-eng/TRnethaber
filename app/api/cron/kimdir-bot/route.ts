/**
 * kimdir-bot (Kahin)
 *
 * 1. Kaynak: Google Trends TR RSS — title alanı = arama anahtar kelimesi
 *    https://trends.google.com/trends/trendingsearches/daily/rss?geo=TR
 * 2. Tur başına 1 anahtar kelime → 1 Gemini çağrısı → en fazla 1 yeni kişi (articles / kimdir)
 * 3. personName articles tablosunda varsa atla (duplicate)
 * 4. Gemini system prompt: lib/bot/kahin-gemini.ts → KAHIN_SYSTEM_PROMPT
 */
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { GEMINI_BUSY_USER_MESSAGE, isGeminiBusyError } from "@/lib/bot/gemini-client";
import { GOOGLE_TRENDS_TR_RSS_URL } from "@/lib/bot/google-trends-rss";
import { KIMDIR_CATEGORY_SLUG } from "@/lib/bot/kahin-gemini";
import { runKahinPipeline } from "@/lib/bot/kahin-pipeline";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function handleCron(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(cronUnauthorizedResponse(), {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const missing = getNewsBotEnvMissing();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Eksik ortam değişkenleri: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  try {
    const result = await runKahinPipeline();

    if (result.saved && result.slug) {
      revalidatePath("/");
      revalidatePath("/admin/articles");
      revalidatePath(`/haber/${result.slug}`);
      revalidatePath(`/kategori/${KIMDIR_CATEGORY_SLUG}`);
    }

    if (result.reason === "gemini_busy") {
      return NextResponse.json(
        {
          ...result,
          success: true,
          engine: "kimdir-bot-kahin-v2",
          trendsRss: GOOGLE_TRENDS_TR_RSS_URL,
          message: GEMINI_BUSY_USER_MESSAGE,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ...result,
        engine: "kimdir-bot-kahin-v2",
        trendsRss: GOOGLE_TRENDS_TR_RSS_URL,
        maxDurationSec: 60,
        personsPerRun: 1,
      },
      { status: result.saved ? 201 : 200 },
    );
  } catch (err) {
    if (isGeminiBusyError(err)) {
      return NextResponse.json(
        {
          ok: true,
          success: true,
          engine: "kimdir-bot-kahin-v2",
          message: GEMINI_BUSY_USER_MESSAGE,
        },
        { status: 200 },
      );
    }

    const message = err instanceof Error ? err.message : "kimdir-bot başarısız";
    console.error("[kimdir-bot]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
