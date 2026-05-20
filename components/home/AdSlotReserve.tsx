/**
 * CLS önleme: standart yatay reklam yüksekliği için rezerv.
 * Gerçek reklam ağı entegrasyonunda aynı min-height korunmalıdır.
 */
export function AdSlotReserve() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6 lg:px-8"
      aria-label="Reklam alanı"
    >
      <div className="h-[90px] w-full rounded-xl border border-dashed border-trnet-text/10 bg-trnet-card/60 shadow-inner" />
    </div>
  );
}
