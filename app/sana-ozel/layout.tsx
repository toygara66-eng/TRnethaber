import { Footer } from "@/components/Footer";
import { BreakingTicker } from "@/components/layout/BreakingTicker";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getHomePageData } from "@/lib/queries/home";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SanaOzelLayout({
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
      <Footer />
    </>
  );
}
