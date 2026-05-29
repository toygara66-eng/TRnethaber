import type { NextRequest } from "next/server";

/**
 * Cron API yetkilendirmesi.
 * - Header: Authorization: Bearer <CRON_SECRET veya CRON_SECRET_KEY>
 * - Query: ?secret=<aynı değer> (tarayıcıdan manuel test)
 */
export function getCronSecret(): string | undefined {
  return (
    process.env.CRON_SECRET?.trim() ||
    process.env.CRON_SECRET_KEY?.trim() ||
    undefined
  );
}

function secretsMatch(provided: string | null | undefined, expected: string): boolean {
  if (!provided?.trim()) return false;
  return provided.trim() === expected;
}

function readQuerySecret(request: Request | NextRequest): string | null {
  const url = "nextUrl" in request && request.nextUrl ? request.nextUrl : new URL(request.url);
  const raw = url.searchParams.get("secret") ?? url.searchParams.get("cron_secret");
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function readBearerSecret(request: Request | NextRequest): string | null {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization) return null;

  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() ?? null;
}

export function verifyCronRequest(request: Request | NextRequest): boolean {
  const validSecret = getCronSecret();
  if (!validSecret) {
    console.warn("[cron-auth] CRON_SECRET veya CRON_SECRET_KEY .env içinde tanımlı değil");
    return false;
  }

  const querySecret = readQuerySecret(request);
  const bearerSecret = readBearerSecret(request);

  const authorized =
    secretsMatch(bearerSecret, validSecret) || secretsMatch(querySecret, validSecret);

  if (!authorized) {
    console.warn(
      "[cron-auth] Yetkisiz istek — Bearer veya ?secret=<CRON_SECRET_KEY> gerekli",
      { hasBearer: Boolean(bearerSecret), hasQuery: Boolean(querySecret) },
    );
  }

  return authorized;
}

export function cronUnauthorizedResponse() {
  const configured = Boolean(getCronSecret());
  return {
    ok: false as const,
    error: "Unauthorized",
    hint: configured
      ? "Authorization: Bearer <CRON_SECRET> veya ?secret=<aynı değer> kullanın"
      : "CRON_SECRET_KEY (veya CRON_SECRET) ortam değişkenini .env.local içinde tanımlayın",
  };
}
