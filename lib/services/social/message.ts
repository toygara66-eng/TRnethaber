import { applyConstitutionRules, validateConstitution } from "@/lib/constitution/text";
import { absoluteUrl } from "@/lib/site";

export const TWITTER_CHAR_LIMIT = 280;

export type SocialArticleInput = {
  title: string;
  spot: string;
  slug: string;
  isBreaking?: boolean;
};

function sanitizeField(text: string): string {
  return applyConstitutionRules(text).replace(/\s+/g, " ").trim();
}

function logConstitutionWarnings(context: string, parts: Record<string, string>): void {
  for (const [label, text] of Object.entries(parts)) {
    const violations = validateConstitution(text);
    if (violations.length > 0) {
      console.warn(`[social-share] ${context} — ${label}:`, violations.join("; "));
    }
  }
}

function truncateWithEllipsis(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  if (maxLen <= 1) return "…";
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}

/** Telegram: başlık + spot + tam link (uzunluk sınırı yok). */
export function buildTelegramMessage(input: SocialArticleInput): string {
  const title = sanitizeField(input.title);
  const spot = sanitizeField(input.spot);
  const url = absoluteUrl(`/haber/${input.slug}`);
  const prefix = input.isBreaking ? "SON DAKİKA\n\n" : "";

  logConstitutionWarnings("telegram", { title, spot });

  return `${prefix}${title}\n\n${spot}\n\n${url}`;
}

/**
 * X (Twitter): anayasa uyumlu metin, en fazla 280 karakter.
 * Öncelik: başlık + link korunur; spot gerekirse kırpılır.
 */
export function buildTweetText(input: SocialArticleInput): string {
  const title = sanitizeField(input.title);
  const spot = sanitizeField(input.spot);
  const url = absoluteUrl(`/haber/${input.slug}`);
  const prefix = input.isBreaking ? "SON DAKİKA · " : "";
  const header = `${prefix}${title}`;
  const footer = `\n\n${url}`;

  logConstitutionWarnings("twitter", { title, spot });

  const reserved = header.length + footer.length + 2;
  const maxSpot = TWITTER_CHAR_LIMIT - reserved;

  if (maxSpot <= 0) {
    const minimal = truncateWithEllipsis(`${header}${footer}`, TWITTER_CHAR_LIMIT);
    return applyConstitutionRules(minimal);
  }

  const spotPart = maxSpot >= spot.length ? spot : truncateWithEllipsis(spot, maxSpot);
  let text = `${header}\n\n${spotPart}${footer}`;

  if (text.length > TWITTER_CHAR_LIMIT) {
    const tighterSpot = truncateWithEllipsis(
      spot,
      TWITTER_CHAR_LIMIT - header.length - footer.length - 2,
    );
    text = `${header}\n\n${tighterSpot}${footer}`;
  }

  if (text.length > TWITTER_CHAR_LIMIT) {
    text = truncateWithEllipsis(`${header}${footer}`, TWITTER_CHAR_LIMIT);
  }

  return applyConstitutionRules(text);
}
