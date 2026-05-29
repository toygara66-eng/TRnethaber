import { NextResponse } from "next/server";
import { getArticlesByCity } from "@/lib/queries/city-feed";
import { isValidCityName } from "@/lib/user-city";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim() ?? "";

  if (!city || !isValidCityName(city)) {
    return NextResponse.json(
      { ok: false, error: "Geçerli bir il adı gerekli." },
      { status: 400 },
    );
  }

  try {
    const cards = await getArticlesByCity(city);
    return NextResponse.json({ ok: true, city, count: cards.length, cards });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sorgu başarısız";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
