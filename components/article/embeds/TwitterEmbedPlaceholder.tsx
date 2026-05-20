type Props = {
  embedId: string;
};

/** CLS: 16:9 or Twitter card ratio — sabit yükseklik rezervi */
export function TwitterEmbedPlaceholder({ embedId }: Props) {
  return (
    <figure
      className="my-10 overflow-hidden rounded-2xl border border-black/[0.08] bg-trnet-card shadow-sm"
      aria-label="X gönderisi yer tutucu"
      data-embed-id={embedId}
    >
      <div className="flex items-center gap-3 border-b border-black/[0.06] bg-trnet-surface px-4 py-3">
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-neutral-200" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-neutral-200" aria-hidden />
          <div className="h-2.5 w-24 animate-pulse rounded bg-neutral-200" aria-hidden />
        </div>
      </div>
      <div className="aspect-[16/9] w-full animate-pulse bg-neutral-100" aria-hidden />
      <figcaption className="sr-only">X gönderisi yüklenecek: {embedId}</figcaption>
    </figure>
  );
}
