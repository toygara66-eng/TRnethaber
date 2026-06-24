import { NextResponse } from "next/server";
import { getSocialProfileLinksFallback } from "@/lib/data/social-links";
import { getSocialProfileLinks } from "@/lib/queries/social-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const links = await getSocialProfileLinks();
    return NextResponse.json({ links });
  } catch (err) {
    console.warn("[api/social-profiles]", err);
    return NextResponse.json({ links: getSocialProfileLinksFallback() });
  }
}
