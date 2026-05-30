export const SITE_NAME = "TRNETHABER";

/** Canlı alan adı değiştiğinde yalnızca bu sabiti güncelleyin. */
export const SITE_URL = "https://trnethaber.com";

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
