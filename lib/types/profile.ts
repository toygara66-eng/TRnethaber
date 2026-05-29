export type ProfileRow = {
  id: string;
  display_name: string | null;
  city: string | null;
  favorite_team: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export function profileNeedsOnboarding(profile: ProfileRow | null): boolean {
  if (!profile) return true;
  return !profile.onboarding_completed || !profile.city?.trim();
}
