"use server";

import { revalidatePath } from "next/cache";
import {
  createRedirectFromBrokenLink,
  deleteRedirect,
  toggleRedirectActive,
} from "@/lib/queries/redirects";
import { invalidateRedirectCache } from "@/lib/redirects/middleware-cache";

export type RedirectActionResult = {
  ok: boolean;
  error?: string;
};

function revalidateRedirectPaths() {
  revalidatePath("/admin/redirects");
  invalidateRedirectCache();
}

export async function saveRedirectAction(
  fromUrl: string,
  toUrl: string,
): Promise<RedirectActionResult> {
  const result = await createRedirectFromBrokenLink(fromUrl, toUrl);
  if (result.ok) revalidateRedirectPaths();
  return result;
}

export async function deleteRedirectAction(id: string): Promise<RedirectActionResult> {
  const result = await deleteRedirect(id);
  if (result.ok) revalidateRedirectPaths();
  return result;
}

export async function toggleRedirectAction(
  id: string,
  isActive: boolean,
): Promise<RedirectActionResult> {
  const result = await toggleRedirectActive(id, isActive);
  if (result.ok) revalidateRedirectPaths();
  return result;
}
