import { getCronSecret } from "@/lib/env/runtime";

export function verifyCronRequest(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");

  if (auth === `Bearer ${secret}`) return true;
  if (cronHeader === secret) return true;

  return false;
}
