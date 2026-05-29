import { NextResponse } from "next/server";
import { getMostReadHomeCards } from "@/lib/queries/most-read";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(6, Math.max(1, Number(searchParams.get("limit") ?? "2") || 2));

  try {
    const cards = await getMostReadHomeCards(limit);
    return NextResponse.json({ cards });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Liste alınamadı.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
