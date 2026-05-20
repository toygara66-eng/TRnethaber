/** Anayasa uyumlu başlangıç okuma sayısı (görüntülenme) metinleri */
const VIEW_COUNT_BANDS = [
  "1 bin 200 okuma",
  "3 bin 450 okuma",
  "6 bin 800 okuma",
  "9 bin 200 okuma",
  "15 bin 350 okuma",
] as const;

export function mockInitialViewCount(seed: string): string {
  const index =
    Math.abs(seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) %
    VIEW_COUNT_BANDS.length;
  return VIEW_COUNT_BANDS[index];
}
