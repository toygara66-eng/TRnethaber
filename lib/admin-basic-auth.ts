import { NextResponse, type NextRequest } from "next/server";

export const ADMIN_USER = "admin";
export const ADMIN_PASS = "patron2026";

export const ADMIN_AUTH_COOKIE = "trnet_admin_auth";
const ADMIN_AUTH_TOKEN = "1";

export const ADMIN_LOGIN_PATH = "/admin/login";

export function isAdminLoginPath(pathname: string): boolean {
  return pathname === ADMIN_LOGIN_PATH;
}

export function isProtectedAdminPath(pathname: string): boolean {
  if (isAdminLoginPath(pathname)) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USER && password === ADMIN_PASS;
}

export function hasAdminAuthCookie(request: NextRequest): boolean {
  return request.cookies.get(ADMIN_AUTH_COOKIE)?.value === ADMIN_AUTH_TOKEN;
}

export function withAdminAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_AUTH_COOKIE, ADMIN_AUTH_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export function clearAdminAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
