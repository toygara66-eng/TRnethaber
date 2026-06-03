import { NextResponse } from "next/server";
import { fetchHomeFeedPage } from "@/lib/queries/home-feed";

export const dynamic = "force-dynamic";

function parseRange(request: Request): { from: number; to: number } | null {
  const { searchParams } = new URL(request.url);
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");

  const from = fromRaw !== null ? Number(fromRaw) : 0;
  const to = toRaw !== null ? Number(toRaw) : 11;

  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
    return null;
  }

  if (to - from > 99) {
    return null;
  }

  return { from: Math.floor(from), to: Math.floor(to) };
}

export async function GET(request: Request) {
  const range = parseRange(request);
  if (!range) {
    return NextResponse.json(
      { error: "Geçersiz from/to parametreleri." },
      { status: 400 },
    );
  }

  try {
    const { rows, error } = await fetchHomeFeedPage(range.from, range.to);
    return NextResponse.json({ rows, error });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Akış yüklenemedi.";
    console.error("[api/home/feed]", err);
    return NextResponse.json({ rows: [], error: message }, { status: 500 });
  }
}
