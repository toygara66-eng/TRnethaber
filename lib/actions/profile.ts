"use server";

import { revalidatePath } from "next/cache";
import { isValidFavoriteTeam } from "@/lib/data/turkish-teams";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findIlByName, isValidCityName } from "@/lib/user-city";

export type ProfileUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateMemberProfile(input: {
  city: string;
  favorite_team: string;
}): Promise<ProfileUpdateResult> {
  const city = input.city?.trim() ?? "";
  const team = input.favorite_team?.trim() ?? "";

  if (!isValidCityName(city)) {
    return { ok: false, error: "Geçerli bir il seçin." };
  }
  if (!team || !isValidFavoriteTeam(team)) {
    return { ok: false, error: "Geçerli bir takım seçin." };
  }

  const il = findIlByName(city)!;
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Oturum gerekli." };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    city: il.name,
    favorite_team: team,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/sana-ozel");
  return { ok: true };
}
