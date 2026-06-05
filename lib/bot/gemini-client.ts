import { GoogleGenerativeAI } from "@google/generative-ai";
import { cleanGeminiJsonText, parseJsonObject } from "@/lib/bot/ai-json-utils";
import { augmentSystemInstruction } from "@/lib/bot/editorial-ai-rules";

export { cleanGeminiJsonText, parseJsonObject } from "@/lib/bot/ai-json-utils";
export { GEMINI_STRICT_JSON_RULE } from "@/lib/bot/editorial-ai-rules";

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

/** Model çıktı üst sınırı — kesik JSON'u önlemek için sabit */
export const GEMINI_MAX_OUTPUT_TOKENS = 8192;

export const GEMINI_PRIMARY_ATTEMPT_MS = 45_000;

export const GEMINI_BUSY_USER_MESSAGE =
  "Yapay zeka sunucuları meşgul, işlem atlandı. Bir sonraki döngüde tekrar denenecek.";

export const AI_PROVIDERS_EXHAUSTED_MESSAGE =
  "Gemini ve OpenRouter yedek motoru yanıt veremedi.";

const JSON_COMPLETION_GUARD =
  "Eğer üreteceğin içerik çok uzunsa, içeriği KESİNLİKLE özetleyerek kısalt. Asla limitine takılma ve cümleni yarım bırakma. JSON yanıtını KESİNLİKLE '}' ile bitir.";

export class GeminiApiBusyError extends Error {
  readonly code = "gemini_busy" as const;
  constructor(message: string) {
    super(message);
    this.name = "GeminiApiBusyError";
  }
}

export class AiProvidersExhaustedError extends Error {
  readonly code = "ai_exhausted" as const;
  constructor(message: string) {
    super(message);
    this.name = "AiProvidersExhaustedError";
  }
}

export function logGeminiBusy(err: unknown): void {
  console.error("Gemini API Meşgul:", err);
}

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil");
  return new GoogleGenerativeAI(apiKey);
}

export function isAiTimeoutError(err: unknown): boolean {
  const blob = err instanceof Error ? `${err.message} ${err.name}` : String(err);
  return /timeout|timed out|deadline|aborted/i.test(blob);
}

export function isGeminiOverloadError(err: unknown): boolean {
  if (err instanceof GeminiApiBusyError) return true;
  const blob =
    err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    blob.includes("503") ||
    blob.includes("429") ||
    blob.includes("too many requests") ||
    blob.includes("quota")
  );
}

export function isGeminiBusyError(err: unknown): err is GeminiApiBusyError {
  return err instanceof GeminiApiBusyError || isGeminiOverloadError(err);
}

export function isAiFallbackEligible(err: unknown): boolean {
  return isGeminiBusyError(err) || isAiTimeoutError(err);
}

export type CallGeminiJsonOptions = {
  liteAugment?: boolean;
  maxOutputTokens?: number;
};

export async function callGeminiJson(
  systemInstruction: string,
  userPrompt: string,
  temperature = 0.35,
  options?: CallGeminiJsonOptions,
): Promise<string> {
  const genAI = getGeminiClient();

  const strictInstruction = `${systemInstruction}

${JSON_COMPLETION_GUARD}
ÖNEMLİ: Cevabın JSON olmalı ve mutlaka kapanış paranteziyle (}) bitmelidir.`;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: augmentSystemInstruction(strictInstruction, {
      lite: options?.liteAugment,
    }),
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_PRIMARY_ATTEMPT_MS);

  try {
    const result = await model.generateContent(userPrompt, {
      signal: controller.signal,
    });
    const text = result.response.text()?.trim();
    if (!text) throw new Error("Gemini boş yanıt döndü");
    return cleanGeminiJsonText(text);
  } finally {
    clearTimeout(timer);
  }
}
