import {
  SOCIAL_PLATFORMS,
  type SocialPlatform,
  type SocialSharedMap,
  socialSharedTooltip,
} from "@/lib/articles/social-shared";

type Props = {
  socialShared: SocialSharedMap;
};

function PlatformIcon({ platform, active }: { platform: SocialPlatform; active: boolean }) {
  const base = "h-3.5 w-3.5 shrink-0 transition";

  switch (platform) {
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="currentColor" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="currentColor" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case "telegram":
      return (
        <svg viewBox="0 0 24 24" className={base} fill="currentColor" aria-hidden>
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
    default:
      return null;
  }
}

const ACTIVE_STYLES: Record<SocialPlatform, string> = {
  twitter: "text-[#0f1419] bg-neutral-100 ring-neutral-200",
  facebook: "text-[#1877F2] bg-[#1877F2]/10 ring-[#1877F2]/25",
  instagram: "text-[#E4405F] bg-[#E4405F]/10 ring-[#E4405F]/25",
  telegram: "text-[#26A5E4] bg-[#26A5E4]/10 ring-[#26A5E4]/25",
};

export function ArticleSocialShareIcons({ socialShared }: Props) {
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Sosyal medya paylaşım durumu"
    >
      {SOCIAL_PLATFORMS.map((platform) => {
        const shared = socialShared[platform];
        const tooltip = socialSharedTooltip(platform, shared);

        return (
          <span key={platform} className="group relative inline-flex">
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md ring-1 transition ${
                shared
                  ? ACTIVE_STYLES[platform]
                  : "text-trnet-text/25 opacity-50 ring-black/[0.06] bg-trnet-surface/60"
              }`}
              title={tooltip}
              aria-label={tooltip}
            >
              <PlatformIcon platform={platform} active={shared} />
            </span>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-trnet-black px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block"
            >
              {tooltip}
            </span>
          </span>
        );
      })}
    </div>
  );
}
