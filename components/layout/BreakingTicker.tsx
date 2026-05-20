const ROW_HEIGHT = "h-10";

type Props = {
  items: string[];
};

export function BreakingTicker({ items }: Props) {
  const joined = items.join("   ·   ");

  return (
    <div
      className={`relative z-50 w-full ${ROW_HEIGHT} overflow-hidden border-b border-black/20 bg-trnet-breaking text-white`}
      role="region"
      aria-label="Son dakika bandı"
    >
      <div className="flex h-full items-center">
        <div className="flex h-full shrink-0 items-center bg-black/25 px-3 text-[11px] font-semibold tracking-[0.2em] sm:px-4 sm:text-xs">
          SON DAKİKA
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="flex w-max animate-marquee">
            <span className="whitespace-nowrap py-2 pr-16 text-[13px] font-medium leading-none sm:text-sm">
              {joined}
            </span>
            <span
              className="whitespace-nowrap py-2 pr-16 text-[13px] font-medium leading-none sm:text-sm"
              aria-hidden
            >
              {joined}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
