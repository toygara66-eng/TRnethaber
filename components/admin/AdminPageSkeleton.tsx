/** Admin layout içinde yalnızca içerik alanı — çift sidebar / taslak görünümünü önler */
export function AdminPageSkeleton() {
  return (
    <div className="admin-page flex animate-pulse flex-col">
      <div className="mb-6 h-9 w-56 max-w-full rounded-lg bg-neutral-200" />
      <div className="mb-3 h-4 w-72 max-w-full rounded bg-neutral-100" />
      <div className="grid flex-1 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)]">
        <div className="space-y-6">
          <div className="h-12 rounded-xl bg-neutral-100" />
          <div className="h-24 rounded-xl bg-neutral-100" />
          <div className="min-h-[320px] rounded-xl bg-neutral-100" />
        </div>
        <div className="space-y-4">
          <div className="h-40 rounded-2xl bg-neutral-100" />
          <div className="h-48 rounded-2xl bg-neutral-100" />
        </div>
      </div>
      <span className="sr-only">Admin yükleniyor</span>
    </div>
  );
}
