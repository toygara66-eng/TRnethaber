import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";

type Props = {
  children: React.ReactNode;
};

export function LegalSiteShell({ children }: Props) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[50vh] bg-trnet-surface pb-16 pt-8">{children}</main>
      <Footer />
    </>
  );
}
