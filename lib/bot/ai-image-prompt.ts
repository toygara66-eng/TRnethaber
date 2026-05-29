/** Imagen / Gemini görsel üretimi — yazısız, sinematik çıktı filtresi */

export const AI_IMAGE_PROMPT_SUFFIX =
  ", highly detailed, cinematic, strictly NO TEXT, NO LETTERS, NO WORDS, clean image, professional photography";

export function finalizeAiImagePrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return AI_IMAGE_PROMPT_SUFFIX.slice(2);
  if (/strictly\s+no\s+text/i.test(trimmed)) return trimmed;
  return `${trimmed}${AI_IMAGE_PROMPT_SUFFIX}`;
}
