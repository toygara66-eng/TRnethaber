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
import { CitySelector } from "@/components/personal/CitySelector";
import {
  readUserCityFromStorage,
  USER_CITY_CHANGED_EVENT,
  writeUserCityToStorage,
} from "@/lib/user-city";

type UserCityContextValue = {
  city: string | null;
  setCity: (cityName: string) => void;
  openCitySelector: () => void;
  ready: boolean;
};

const UserCityContext = createContext<UserCityContextValue | null>(null);

export function useUserCity(): UserCityContextValue {
  const ctx = useContext(UserCityContext);
  if (!ctx) {
    throw new Error("useUserCity must be used within UserCityProvider");
  }
  return ctx;
}

export function UserCityProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [dismissedWelcome, setDismissedWelcome] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setCityState(readUserCityFromStorage());
    setReady(true);

    const onCityChanged = (event: Event) => {
      const name = (event as CustomEvent<string>).detail;
      if (name) setCityState(name);
    };
    window.addEventListener(USER_CITY_CHANGED_EVENT, onCityChanged);
    return () => window.removeEventListener(USER_CITY_CHANGED_EVENT, onCityChanged);
  }, []);

  useEffect(() => {
    if (!ready || city || dismissedWelcome) return;
    if (pathname.startsWith("/admin")) return;
    setSelectorOpen(true);
  }, [ready, city, dismissedWelcome, pathname]);

  const setCity = useCallback(
    (cityName: string) => {
      writeUserCityToStorage(cityName);
      setCityState(cityName);
      setDismissedWelcome(true);
      if (pathname !== "/sana-ozel") {
        router.push("/sana-ozel");
      } else {
        router.refresh();
      }
    },
    [pathname, router],
  );

  const openCitySelector = useCallback(() => {
    setSelectorOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      city,
      setCity,
      openCitySelector,
      ready,
    }),
    [city, setCity, openCitySelector, ready],
  );

  return (
    <UserCityContext.Provider value={value}>
      {children}
      <CitySelector
        open={selectorOpen}
        onClose={() => {
          setSelectorOpen(false);
          setDismissedWelcome(true);
        }}
        onSelect={setCity}
        initialCity={city}
      />
    </UserCityContext.Provider>
  );
}
