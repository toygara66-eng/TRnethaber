import { NextResponse } from "next/server";
import { clearAdminAuthCookie } from "@/lib/admin-basic-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  return clearAdminAuthCookie(response);
}
