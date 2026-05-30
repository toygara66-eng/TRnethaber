import { NextResponse } from "next/server";
import { getHomeVitrin } from "@/lib/queries/home-vitrin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const vitrin = await getHomeVitrin();
    return NextResponse.json(vitrin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vitrin yüklenemedi.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
