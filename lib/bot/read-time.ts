/**
 * İçerik uzunluğundan anayasa formatında okuma süresi üretir.
 * Örn: "6 dakika okuma"
 */
export function computeReadTimeLabel(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.min(20, Math.ceil(words / 200)));
  return `${minutes} dakika okuma`;
}
