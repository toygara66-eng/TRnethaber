/** Başlıktan URL slug üretir (Türkçe karakterler dönüştürülür). */
export function slugifyTitle(title: string): string {
  const map: Record<string, string> = {
    ğ: "g",
    ü: "u",
    ş: "s",
    ı: "i",
    ö: "o",
    ç: "c",
    Ğ: "g",
    Ü: "u",
    Ş: "s",
    İ: "i",
    Ö: "o",
    Ç: "c",
  };

  const normalized = title
    .trim()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
