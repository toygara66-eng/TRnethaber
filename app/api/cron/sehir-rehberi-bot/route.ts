/**
 * sehir-rehberi-bot — Premium şehir gezi rehberi (seyahat)
 * - cities.ts → rastgele 1 il
 * - Duplicate: il için rehber zaten varsa atla
 * - Gemini: lib/bot/sehir-rehberi-gemini.ts
 */
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { GEMINI_BUSY_USER_MESSAGE, isGeminiBusyError } from "@/lib/bot/gemini-client";
import { runSehirRehberiPipeline } from "@/lib/bot/sehir-rehberi-pipeline";
import { SEYAHAT_CATEGORY_SLUG } from "@/lib/bot/sehir-rehberi-gemini";
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
    const result = await runSehirRehberiPipeline();

    if (result.saved && result.slug) {
      revalidatePath("/");
      revalidatePath("/admin/articles");
      revalidatePath(`/haber/${result.slug}`);
      revalidatePath(`/kategori/${SEYAHAT_CATEGORY_SLUG}`);
      if (result.city) {
        revalidatePath(`/kategori/${result.city.slug}`);
      }
    }

    if (result.reason === "gemini_busy") {
      return NextResponse.json(
        {
          ...result,
          success: true,
          engine: "sehir-rehberi-bot-v1",
          message: GEMINI_BUSY_USER_MESSAGE,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ...result,
        engine: "sehir-rehberi-bot-v1",
        maxDurationSec: 60,
        citiesPerRun: 1,
      },
      { status: result.saved ? 201 : 200 },
    );
  } catch (err) {
    if (isGeminiBusyError(err)) {
      return NextResponse.json(
        {
          ok: true,
          success: true,
          engine: "sehir-rehberi-bot-v1",
          message: GEMINI_BUSY_USER_MESSAGE,
        },
        { status: 200 },
      );
    }

    const message = err instanceof Error ? err.message : "sehir-rehberi-bot başarısız";
    console.error("[sehir-rehberi-bot]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
