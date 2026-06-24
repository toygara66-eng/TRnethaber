import {
  buildSocialProfileLinks,
  DEFAULT_SOCIAL_PROFILES,
  emptySocialProfileSettings,
  SOCIAL_PROFILE_IDS,
  SOCIAL_SETTING_KEYS,
  type SocialProfileLink,
  type SocialProfileSettings,
} from "@/lib/data/social-links";
import {
  isMissingSiteSettingsTable,
  SITE_SETTINGS_MIGRATION_HINT,
} from "@/lib/queries/site-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseClient } from "@/lib/supabase";

function mapSocialRows(
  rows: { key: string; value: string }[] | null,
): { settings: SocialProfileSettings; storedKeys: Set<string> } {
  const map = new Map((rows ?? []).map((row) => [row.key, row.value ?? ""]));
  const storedKeys = new Set(map.keys());
  const settings = emptySocialProfileSettings();

  for (const id of SOCIAL_PROFILE_IDS) {
    const keys = SOCIAL_SETTING_KEYS[id];
    settings[id] = {
      url: map.get(keys.url) ?? "",
      handle: map.get(keys.handle) ?? "",
    };
  }

  return { settings, storedKeys };
}

function mapSocialRowsForAdmin(
  rows: { key: string; value: string }[] | null,
): SocialProfileSettings {
  const map = new Map((rows ?? []).map((row) => [row.key, row.value ?? ""]));
  const settings = emptySocialProfileSettings();

  for (const id of SOCIAL_PROFILE_IDS) {
    const keys = SOCIAL_SETTING_KEYS[id];
    const defaults = DEFAULT_SOCIAL_PROFILES[id];
    settings[id] = {
      url: map.get(keys.url)?.trim() || defaults.href,
      handle: map.get(keys.handle)?.trim() || defaults.handle,
    };
  }

  return settings;
}

async function fetchSocialSettingRows(): Promise<{
  rows: { key: string; value: string }[] | null;
  errorMessage?: string;
}> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", SOCIAL_PROFILE_IDS.flatMap((id) => {
      const keys = SOCIAL_SETTING_KEYS[id];
      return [keys.url, keys.handle];
    }));

  if (error) {
    return { rows: null, errorMessage: error.message };
  }

  return { rows: data as { key: string; value: string }[] };
}

export async function getSocialProfileLinks(): Promise<SocialProfileLink[]> {
  const { rows, errorMessage } = await fetchSocialSettingRows();

  if (errorMessage && isMissingSiteSettingsTable(errorMessage)) {
    return buildSocialProfileLinks(null);
  }

  if (!rows?.length) {
    return buildSocialProfileLinks(null);
  }

  const { settings, storedKeys } = mapSocialRows(rows);
  return buildSocialProfileLinks(settings, storedKeys);
}

export async function getSocialSettingsAdmin(): Promise<SocialProfileSettings> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", SOCIAL_PROFILE_IDS.flatMap((id) => {
        const keys = SOCIAL_SETTING_KEYS[id];
        return [keys.url, keys.handle];
      }));

    if (error) {
      if (isMissingSiteSettingsTable(error.message)) {
        return mapSocialRowsForAdmin(null);
      }
      console.warn("[getSocialSettingsAdmin]", error.message);
      return mapSocialRowsForAdmin(null);
    }

    if (!data?.length) {
      return mapSocialRowsForAdmin(null);
    }

    return mapSocialRowsForAdmin(data as { key: string; value: string }[]);
  } catch {
    return mapSocialRowsForAdmin(null);
  }
}

export async function upsertSocialSettings(settings: SocialProfileSettings): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const rows = SOCIAL_PROFILE_IDS.flatMap((id) => {
    const keys = SOCIAL_SETTING_KEYS[id];
    const value = settings[id];
    return [
      { key: keys.url, value: value.url.trim() },
      { key: keys.handle, value: value.handle.trim() },
    ];
  });

  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });

  if (error) {
    if (isMissingSiteSettingsTable(error.message)) {
      throw new Error(`site_settings tablosu bulunamadı. ${SITE_SETTINGS_MIGRATION_HINT}`);
    }
    throw new Error(error.message);
  }
}
