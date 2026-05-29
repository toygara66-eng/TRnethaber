export const SOCIAL_PLATFORMS = ["twitter", "facebook", "instagram", "telegram"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialSharedMap = Record<SocialPlatform, boolean>;

export const DEFAULT_SOCIAL_SHARED: SocialSharedMap = {
  twitter: false,
  facebook: false,
  instagram: false,
  telegram: false,
};

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  twitter: "Twitter",
  facebook: "Facebook",
  instagram: "Instagram",
  telegram: "Telegram",
};

export function parseSocialShared(raw: unknown): SocialSharedMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_SOCIAL_SHARED };
  }

  const obj = raw as Record<string, unknown>;
  return {
    twitter: Boolean(obj.twitter),
    facebook: Boolean(obj.facebook),
    instagram: Boolean(obj.instagram),
    telegram: Boolean(obj.telegram),
  };
}

export function socialSharedTooltip(platform: SocialPlatform, shared: boolean): string {
  const name = SOCIAL_PLATFORM_LABELS[platform];
  return shared ? `${name}'da Paylaşıldı` : `${name}'da Paylaşılmadı`;
}

export function isMissingSocialSharedColumn(message?: string): boolean {
  if (!message) return false;
  return message.includes("social_shared") || message.includes("42703");
}
