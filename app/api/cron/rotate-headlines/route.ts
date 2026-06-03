import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { rotateExpiredHeadlines } from "@/lib/articles/headline-automation";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleRotate(request);
}

export async function POST(request: Request) {
  return handleRotate(request);
}

async function handleRotate(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(cronUnauthorizedResponse(), { status: 401 });
  }

  try {
    const result = await rotateExpiredHeadlines();

    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    revalidatePath("/");
    revalidatePath("/api/home/vitrin");

    return NextResponse.json({
      ok: true,
      cleared: result.cleared,
      message: `${result.cleared} manşet kaydı 6 saat sonrası temizlendi.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Manşet rotasyonu başarısız.";
    console.error("[rotate-headlines]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
