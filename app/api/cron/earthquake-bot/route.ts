import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/bot/cron-auth";
import { runEarthquakeBotPipeline } from "@/lib/bot/earthquake-pipeline";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

async function handleCron(request: Request) {
  const missing = getNewsBotEnvMissing();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Eksik ortam değişkenleri: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  if (!verifyCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const result = await runEarthquakeBotPipeline();

    if (result.triggered) {
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath(`/haber/${result.article.slug}`);
      for (const entity of result.entities) {
        revalidatePath(`/kimdir/${entity.slug}`);
      }
      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deprem botu başarısız";
    console.error("[earthquake-bot]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
