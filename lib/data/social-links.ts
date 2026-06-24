export type SocialProfileId = "x" | "facebook" | "instagram" | "telegram" | "youtube";

export const SOCIAL_PROFILE_IDS: SocialProfileId[] = [
  "x",
  "facebook",
  "instagram",
  "telegram",
  "youtube",
];

export type SocialProfileLink = {
  id: SocialProfileId;
  label: string;
  handle: string;
  href: string;
};

export type SocialProfileSettings = Record<
  SocialProfileId,
  { url: string; handle: string }
>;

export const DEFAULT_SOCIAL_PROFILES: Record<
  SocialProfileId,
  { label: string; handle: string; href: string }
> = {
  x: {
    label: "X (Twitter)",
    handle: "@TRNETHABER",
    href: "https://x.com/TRNETHABER",
  },
  facebook: {
    label: "Facebook",
    handle: "TRNETHABER",
    href: "https://www.facebook.com/TRNETHABER",
  },
  instagram: {
    label: "Instagram",
    handle: "@trnethaber",
    href: "https://www.instagram.com/trnethaber",
  },
  telegram: {
    label: "Telegram",
    handle: "@trnethaber",
    href: "https://t.me/trnethaber",
  },
  youtube: {
    label: "YouTube",
    handle: "@TRNETHABER",
    href: "https://www.youtube.com/@TRNETHABER",
  },
};

export const SOCIAL_SETTING_KEYS: Record<
  SocialProfileId,
  { url: string; handle: string }
> = {
  x: { url: "social_x_url", handle: "social_x_handle" },
  facebook: { url: "social_facebook_url", handle: "social_facebook_handle" },
  instagram: { url: "social_instagram_url", handle: "social_instagram_handle" },
  telegram: { url: "social_telegram_url", handle: "social_telegram_handle" },
  youtube: { url: "social_youtube_url", handle: "social_youtube_handle" },
};

const ENV_URL_KEYS: Record<SocialProfileId, string> = {
  x: "NEXT_PUBLIC_SOCIAL_X_URL",
  facebook: "NEXT_PUBLIC_SOCIAL_FACEBOOK_URL",
  instagram: "NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL",
  telegram: "NEXT_PUBLIC_SOCIAL_TELEGRAM_URL",
  youtube: "NEXT_PUBLIC_SOCIAL_YOUTUBE_URL",
};

function envUrl(id: SocialProfileId): string | undefined {
  return process.env[ENV_URL_KEYS[id]]?.trim() || undefined;
}

export function emptySocialProfileSettings(): SocialProfileSettings {
  return {
    x: { url: "", handle: "" },
    facebook: { url: "", handle: "" },
    instagram: { url: "", handle: "" },
    telegram: { url: "", handle: "" },
    youtube: { url: "", handle: "" },
  };
}

/** DB satırları + env + kod varsayılanlarından vitrin listesi üretir */
export function buildSocialProfileLinks(
  stored: Partial<SocialProfileSettings> | null | undefined,
  storedKeys: Set<string> | null = null,
): SocialProfileLink[] {
  const links: SocialProfileLink[] = [];

  for (const id of SOCIAL_PROFILE_IDS) {
    const defaults = DEFAULT_SOCIAL_PROFILES[id];
    const keys = SOCIAL_SETTING_KEYS[id];
    const row = stored?.[id];

    const dbUrlDefined = storedKeys?.has(keys.url) ?? row?.url !== undefined;
    const dbHandleDefined = storedKeys?.has(keys.handle) ?? row?.handle !== undefined;

    let href = "";
    if (dbUrlDefined) {
      href = row?.url?.trim() ?? "";
    } else {
      href = envUrl(id) ?? defaults.href;
    }

    if (!href) continue;

    const handle = dbHandleDefined
      ? row?.handle?.trim() || defaults.handle
      : defaults.handle;

    links.push({
      id,
      label: defaults.label,
      handle,
      href,
    });
  }

  return links;
}

/** Env + kod varsayılanları (DB yokken) */
export function getSocialProfileLinksFallback(): SocialProfileLink[] {
  return buildSocialProfileLinks(null);
}
