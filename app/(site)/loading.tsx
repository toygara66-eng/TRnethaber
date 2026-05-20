import { HomePageSkeleton } from "@/components/home/HomePageSkeleton";

/** Yalnızca vitrin anasayfası — /admin bu iskeleti görmez. */
export default function SiteLoading() {
  return <HomePageSkeleton />;
}
