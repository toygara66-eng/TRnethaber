export default function EntityLoading() {
  return (
    <div className="animate-pulse bg-trnet-surface">
      <div className="min-h-[min(68vh,640px)] bg-trnet-black/90" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 sm:px-6">
        <div className="h-32 rounded-2xl bg-trnet-card" />
        <div className="h-4 w-3/4 rounded bg-trnet-card" />
        <div className="h-4 w-full rounded bg-trnet-card" />
        <div className="h-4 w-5/6 rounded bg-trnet-card" />
      </div>
    </div>
  );
}
