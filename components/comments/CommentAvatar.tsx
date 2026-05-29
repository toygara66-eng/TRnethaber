import { SafeImage } from "@/components/ui/SafeImage";

type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toLocaleUpperCase("tr");
  }
  return (parts[0]?.slice(0, 2) ?? "Ü").toLocaleUpperCase("tr");
}

export function CommentAvatar({ name, avatarUrl, size = "md" }: Props) {
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  if (avatarUrl?.trim()) {
    return (
      <div
        className={`relative ${dim} shrink-0 overflow-hidden rounded-full border border-black/[0.08] bg-neutral-100`}
      >
        <SafeImage
          src={avatarUrl}
          alt=""
          fill
          sizes="44px"
          className="object-cover"
          placeholderVariant="card"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full border border-trnet-primary/20 bg-trnet-primary/10 font-semibold text-trnet-primary ${textSize}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
