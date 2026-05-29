import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/article-schema";
import { getSiteSettings } from "@/lib/queries/site-settings";

export async function SiteJsonLd() {
  try {
    const settings = await getSiteSettings();
    const organization = buildOrganizationJsonLd(settings?.logoSquareUrl);
    const website = buildWebSiteJsonLd();

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
        />
      </>
    );
  } catch (err) {
    console.warn("[SiteJsonLd]", err);
    const organization = buildOrganizationJsonLd(null);
    const website = buildWebSiteJsonLd();
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
    );
  }
}
