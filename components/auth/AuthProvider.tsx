"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { MemberOnboardingModal } from "@/components/personal/MemberOnboardingModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { profileNeedsOnboarding, type ProfileRow } from "@/lib/types/profile";

type AuthContextValue = {
  user: User | null;
  profile: ProfileRow | null;
  ready: boolean;
  openOnboarding: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileRow;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [ready, setReady] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const row = await fetchProfile(user.id);
    setProfile(row);
  }, [user]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        setProfile(await fetchProfile(session.user.id));
      }
      setReady(true);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    if (
      pathname.startsWith("/admin") ||
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname.startsWith("/auth")
    ) {
      return;
    }
    if (profileNeedsOnboarding(profile)) {
      setOnboardingOpen(true);
    }
  }, [ready, user, profile, pathname]);

  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/");
    router.refresh();
  }, [router]);

  const openOnboarding = useCallback(() => {
    setOnboardingOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      ready,
      openOnboarding,
      refreshProfile,
      signOut,
    }),
    [user, profile, ready, openOnboarding, refreshProfile, signOut],
  );

  const handleOnboardingSaved = useCallback(async () => {
    await refreshProfile();
    setOnboardingOpen(false);
    if (pathname !== "/sana-ozel") {
      router.push("/sana-ozel");
    } else {
      router.refresh();
    }
  }, [refreshProfile, pathname, router]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {user ? (
        <MemberOnboardingModal
          open={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          onSaved={handleOnboardingSaved}
          initialCity={profile?.city}
          initialTeam={profile?.favorite_team}
        />
      ) : null}
    </AuthContext.Provider>
  );
}
