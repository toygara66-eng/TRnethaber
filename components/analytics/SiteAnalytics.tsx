import { GoogleAnalytics } from "@next/third-parties/google";

/**
 * Google Analytics — yalnızca NEXT_PUBLIC_GA_ID tanımlıysa yüklenir.
 * @next/third-parties: afterInteractive, ana iş parçacığını bloklamaz.
 */
export function SiteAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!gaId) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
