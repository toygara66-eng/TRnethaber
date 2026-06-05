import { NextResponse } from "next/server";
import { cronUnauthorizedResponse, verifyCronRequest } from "@/lib/bot/cron-auth";
import { runNewsBotProcessJob } from "@/lib/bot/news-bot-process-job";
import { getNewsBotEnvMissing } from "@/lib/env/runtime";

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

  const result = await runNewsBotProcessJob();
  const { httpStatus, ...body } = result;
  return NextResponse.json(body, { status: httpStatus });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
