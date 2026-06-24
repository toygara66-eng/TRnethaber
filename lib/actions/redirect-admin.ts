"use server";

import { revalidatePath } from "next/cache";
import {
  createRedirectRule,
  deleteRedirect,
  toggleRedirectActive,
} from "@/lib/queries/redirects";
import { invalidateRedirectCache } from "@/lib/redirects/middleware-cache";
import { normalizePath } from "@/lib/redirects/normalize";

export type RedirectActionResult = {
  ok: boolean;
  error?: string;
};

function revalidateRedirectPaths(fromUrl?: string) {
  revalidatePath("/admin/redirects");
  invalidateRedirectCache();

  const from = fromUrl ? normalizePath(fromUrl) : undefined;
  if (from && from !== "/") {
    revalidatePath(from);
  }
}

export async function saveRedirectAction(
  fromUrl: string,
  toUrl: string,
): Promise<RedirectActionResult> {
  const result = await createRedirectRule(fromUrl, toUrl);
  if (result.ok) revalidateRedirectPaths(result.from_url ?? fromUrl);
  return result;
}

export async function deleteRedirectAction(id: string): Promise<RedirectActionResult> {
  const result = await deleteRedirect(id);
  if (result.ok) revalidateRedirectPaths(result.from_url);
  return result;
}

export async function toggleRedirectAction(
  id: string,
  isActive: boolean,
): Promise<RedirectActionResult> {
  const result = await toggleRedirectActive(id, isActive);
  if (result.ok) revalidateRedirectPaths(result.from_url);
  return result;
}
