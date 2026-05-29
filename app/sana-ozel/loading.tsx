export default function SanaOzelLoading() {
  return (
    <main className="min-h-[60vh] bg-trnet-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="h-9 w-64 animate-pulse rounded-lg bg-neutral-200" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-black/[0.06] bg-trnet-card"
            >
              <div className="aspect-[16/10] animate-pulse bg-neutral-200" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
                <div className="h-5 w-full animate-pulse rounded bg-neutral-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
