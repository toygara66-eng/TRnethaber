import { NextResponse } from "next/server";
import {
  verifyAdminCredentials,
  withAdminAuthCookie,
} from "@/lib/admin-basic-auth";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek" }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!verifyAdminCredentials(username, password)) {
    return NextResponse.json({ ok: false, error: "Kullanıcı adı veya şifre hatalı" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  return withAdminAuthCookie(response);
}
