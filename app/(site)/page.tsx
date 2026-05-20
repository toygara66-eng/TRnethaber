import { BreakingTicker } from "@/components/layout/BreakingTicker";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HomeHero } from "@/components/home/HomeHero";
import { AdSlotReserve } from "@/components/home/AdSlotReserve";
import { getHomePageData } from "@/lib/queries/home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { breakingTicker, heroSlides, categorySections, status, errorMessage } =
    await getHomePageData();

  return (
    <>
      {breakingTicker.length > 0 ? <BreakingTicker items={breakingTicker} /> : null}
      <SiteHeader />
      <main className="bg-trnet-surface pb-16 pt-0">
        <HomeHero slides={heroSlides} status={status} errorMessage={errorMessage} />
        <AdSlotReserve />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <CategoryGrid sections={categorySections} status={status} errorMessage={errorMessage} />
        </div>
      </main>
    </>
  );
}
