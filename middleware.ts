import { type NextRequest, NextResponse } from "next/server";
import {
  ADMIN_LOGIN_PATH,
  hasAdminAuthCookie,
  isAdminLoginPath,
  isProtectedAdminPath,
} from "@/lib/admin-basic-auth";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminLoginPath(pathname)) {
    if (hasAdminAuthCookie(request)) {
      return NextResponse.redirect(new URL("/admin/articles", request.url));
    }
    return updateSession(request);
  }

  if (isProtectedAdminPath(pathname)) {
    if (!hasAdminAuthCookie(request)) {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return updateSession(request);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
