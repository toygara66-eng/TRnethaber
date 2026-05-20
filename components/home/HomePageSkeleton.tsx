export function HomePageSkeleton() {
  return (
    <div className="min-h-dvh bg-trnet-surface">
      <div className="h-10 w-full animate-pulse bg-trnet-breaking/80" aria-hidden />
      <div className="sticky top-0 z-40 h-16 w-full animate-pulse border-b border-white/10 bg-trnet-black sm:h-20" aria-hidden />
      <div className="w-full">
        <div
          className="min-h-[420px] w-full animate-pulse bg-neutral-300 sm:min-h-[480px] lg:min-h-[560px]"
          aria-hidden
        />
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6 lg:px-8">
        <div
          className="h-[90px] w-full animate-pulse rounded-xl bg-neutral-200"
          aria-hidden
        />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-md bg-neutral-300" aria-hidden />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-black/[0.06] bg-trnet-card shadow-sm"
            >
              <div className="aspect-[16/10] w-full animate-pulse bg-neutral-200" aria-hidden />
              <div className="space-y-3 p-5">
                <div className="h-3 w-28 animate-pulse rounded bg-neutral-200" aria-hidden />
                <div className="h-5 w-full animate-pulse rounded bg-neutral-200" aria-hidden />
                <div className="h-5 max-w-[90%] animate-pulse rounded bg-neutral-200" aria-hidden />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Sayfa yükleniyor</span>
    </div>
  );
}
