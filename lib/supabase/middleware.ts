import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const MEMBER_ONLY_PREFIXES = ["/sana-ozel", "/api/feed/personal", "/api/feed/city"];

export async function updateSession(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (pathname === "/") {
    const city = request.nextUrl.searchParams.get("city")?.trim();
    if (city) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/sana-ozel";
      redirectUrl.searchParams.set("city", city);
      return NextResponse.redirect(redirectUrl);
    }
  }

  const isProtected = MEMBER_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/signup";
    redirectUrl.searchParams.set("redirect", pathname);
    redirectUrl.searchParams.set("reason", "personalize");
    return NextResponse.redirect(redirectUrl);
  }

  if ((pathname === "/login" || pathname === "/signup") && user) {
    const redirectTo =
      request.nextUrl.searchParams.get("redirect")?.trim() || "/sana-ozel";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectTo.startsWith("/") ? redirectTo : "/sana-ozel";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
