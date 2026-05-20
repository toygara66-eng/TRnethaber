export default function ArticleLoading() {
  return (
    <div className="bg-trnet-surface" aria-busy="true" aria-label="Haber yükleniyor">
        <div className="relative min-h-[min(72vh,720px)] w-full animate-pulse bg-neutral-300">
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-4xl px-4 pb-10 sm:px-6">
            <div className="mb-4 h-4 w-56 rounded bg-white/30" />
            <div className="mb-3 h-6 w-24 rounded-full bg-white/25" />
            <div className="h-12 w-full max-w-3xl rounded bg-white/35 sm:h-14" />
            <div className="mt-4 h-5 max-w-xl rounded bg-white/25 sm:w-2/3 w-full" />
            <div className="mt-6 flex gap-4">
              <div className="h-4 w-28 rounded bg-white/25" />
              <div className="h-4 w-32 rounded bg-white/25" />
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-neutral-200" />
          ))}
          <div className="aspect-[16/9] animate-pulse rounded-2xl bg-neutral-200" />
          <div className="aspect-video animate-pulse rounded-2xl bg-neutral-300" />
        </div>
      <span className="sr-only">Sayfa yükleniyor</span>
    </div>
  );
}
