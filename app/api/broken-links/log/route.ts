import { NextResponse } from "next/server";
import { logBrokenLink } from "@/lib/queries/redirects";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ error: "url zorunludur." }, { status: 400 });
    }

    await logBrokenLink(url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/broken-links/log]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
