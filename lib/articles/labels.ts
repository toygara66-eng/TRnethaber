import { mockInitialViewCount } from "@/lib/bot/view-count";
import { computeReadTimeLabel } from "@/lib/bot/read-time";

/** Eski bot kayıtlarında okuma süresi yanlışlıkla okuma_sayisi sütununa yazılmış. */
export function isReadTimeStoredAsViewCount(value: string): boolean {
  return /dakika\s*okuma/i.test(value.trim());
}

/** Saat ikonu: içerikten hesaplanan okuma süresi */
export function resolveReadTimeLabel(content: string): string {
  return computeReadTimeLabel(content);
}

/** Göz ikonu: görüntülenme metni (okuma_sayisi); hatalı süre metnini düzeltir */
export function resolveViewCountLabel(
  okumaSayisi: string | null | undefined,
  slug: string,
): string {
  const trimmed = okumaSayisi?.trim() ?? "";

  if (!trimmed || isReadTimeStoredAsViewCount(trimmed)) {
    return mockInitialViewCount(slug);
  }

  if (!/\bokuma\s*$/i.test(trimmed)) {
    return `${trimmed} okuma`;
  }

  return trimmed;
}
