import { BreakingTicker } from "@/components/layout/BreakingTicker";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getHomePageData } from "@/lib/queries/home";

export const dynamic = "force-dynamic";

export default async function CategoryRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { breakingTicker } = await getHomePageData();

  return (
    <>
      {breakingTicker.length > 0 ? <BreakingTicker items={breakingTicker} /> : null}
      <SiteHeader />
      {children}
    </>
  );
}
