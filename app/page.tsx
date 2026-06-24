import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import { buildHomePageMetadata } from "@/lib/seo/site-metadata";

export const metadata: Metadata = buildHomePageMetadata();

export default function HomePage() {
  return <HomePageClient />;
}
