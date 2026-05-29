import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types/profile";

export async function getProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error?.message?.includes("profiles")) {
    return null;
  }
  if (error || !data) return null;
  return data as ProfileRow;
}

export async function getCurrentUserProfile(): Promise<{
  userId: string;
  profile: ProfileRow | null;
} | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await getProfileByUserId(user.id);
  return { userId: user.id, profile };
}
