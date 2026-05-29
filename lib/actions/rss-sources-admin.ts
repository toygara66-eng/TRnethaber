"use server";

import { revalidatePath } from "next/cache";
import {
  createRssSource,
  deleteRssSource,
  toggleRssSourceActive,
  updateRssSource,
  type RssSourceInput,
} from "@/lib/queries/rss-sources";

export type RssSourceActionResult = {
  ok: boolean;
  error?: string;
};

function revalidateRssSources() {
  revalidatePath("/admin/kaynaklar");
}

function parseInput(formData: FormData): RssSourceInput | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!name) return { error: "Kaynak adı zorunludur." };
  if (!url) return { error: "RSS URL zorunludur." };
  if (!/^https?:\/\//i.test(url)) {
    return { error: "RSS URL http:// veya https:// ile başlamalıdır." };
  }

  return { name, url, city, category };
}

export async function saveRssSourceAction(
  _prev: RssSourceActionResult,
  formData: FormData,
): Promise<RssSourceActionResult> {
  const parsed = parseInput(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const id = String(formData.get("id") ?? "").trim();
  const result = id
    ? await updateRssSource(id, parsed)
    : await createRssSource(parsed);

  if (result.ok) revalidateRssSources();
  return result;
}

export async function deleteRssSourceAction(id: string): Promise<RssSourceActionResult> {
  const result = await deleteRssSource(id);
  if (result.ok) revalidateRssSources();
  return result;
}

export async function toggleRssSourceAction(
  id: string,
  isActive: boolean,
): Promise<RssSourceActionResult> {
  const result = await toggleRssSourceActive(id, isActive);
  if (result.ok) revalidateRssSources();
  return result;
}
