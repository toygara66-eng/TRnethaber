export function AdminPageSkeleton() {
  return (
    <div className="flex min-h-dvh animate-pulse">
      <aside className="hidden w-64 shrink-0 bg-trnet-black md:block" aria-hidden />
      <div className="flex flex-1 flex-col">
        <div className="h-20 border-b border-black/[0.06] bg-trnet-card" />
        <div className="space-y-4 p-6 lg:p-8">
          <div className="h-10 w-64 rounded-lg bg-neutral-200" />
          <div className="rounded-2xl border border-black/[0.06] bg-trnet-card p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mb-4 h-12 rounded-lg bg-neutral-100 last:mb-0" />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Admin yükleniyor</span>
    </div>
  );
}
