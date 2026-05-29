import { NextResponse } from "next/server";
import { getPersonalizedFeed } from "@/lib/queries/personal-feed";
import { getProfileByUserId } from "@/lib/queries/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Oturum gerekli." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const profile = await getProfileByUserId(user.id);
  const city = profile?.city?.trim();
  if (!city) {
    return NextResponse.json(
      { ok: false, error: "Profil tamamlanmadı.", needsOnboarding: true },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const cards = await getPersonalizedFeed(city, profile?.favorite_team);
    return NextResponse.json(
      {
        ok: true,
        city,
        favorite_team: profile?.favorite_team ?? null,
        count: cards.length,
        cards,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sorgu başarısız";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
