import { NextResponse, type NextRequest } from "next/server";
import { getRedirectTarget } from "@/lib/redirects/middleware-cache";
import { normalizePath } from "@/lib/redirects/normalize";

const SKIP_PREFIXES = ["/admin", "/api", "/_next", "/auth"];

export function shouldCheckUrlRedirect(pathname: string): boolean {
  if (pathname === "/favicon.ico") return false;
  return !SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Veritabanındaki 301 kuralını uygular; eşleşme yoksa null */
export async function applyUrlRedirect(request: NextRequest): Promise<NextResponse | null> {
  const pathname = normalizePath(request.nextUrl.pathname);
  const target = await getRedirectTarget(pathname);
  if (!target) return null;

  const destination =
    target.startsWith("http://") || target.startsWith("https://")
      ? target
      : new URL(normalizePath(target), request.url).toString();

  return NextResponse.redirect(destination, 301);
}
