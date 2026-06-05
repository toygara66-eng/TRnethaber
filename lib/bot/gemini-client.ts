import { GoogleGenerativeAI } from "@google/generative-ai";
import { cleanGeminiJsonText, parseJsonObject } from "@/lib/bot/ai-json-utils";
import { augmentSystemInstruction } from "@/lib/bot/editorial-ai-rules";
import { callOpenRouterJson, hasOpenRouterEnv } from "@/lib/bot/openrouter-client";

export { cleanGeminiJsonText, parseJsonObject } from "@/lib/bot/ai-json-utils";
export { GEMINI_STRICT_JSON_RULE } from "@/lib/bot/editorial-ai-rules";

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

/** Model çıktı üst sınırı — kesik JSON'u önlemek için sabit */
export const GEMINI_MAX_OUTPUT_TOKENS = 8192;

/** Haber başına Gemini birincil deneme — 15 sn sonra OpenRouter */
export const GEMINI_PRIMARY_ATTEMPT_MS = 15_000;

/** Gemini timeout sonrası OpenRouter yedek üst sınırı (toplam < 60 sn) */
export const OPENROUTER_NEWS_FALLBACK_TIMEOUT_MS = 25_000;

export const GEMINI_BUSY_USER_MESSAGE =
  "Yapay zeka sunucuları meşgul, işlem atlandı. Bir sonraki döngüde tekrar denenecek.";

export const AI_PROVIDERS_EXHAUSTED_MESSAGE =
  "Gemini ve OpenRouter yedek motoru yanıt veremedi.";

const JSON_COMPLETION_GUARD =
  "Cevabın JSON formatında olsun. Metin çok uzun olursa içeriği özetle, sakın limitine takılma. Yanıtını KESİNLİKLE '}' karakteriyle sonlandır.";

export class GeminiApiBusyError extends Error {
  readonly code = "gemini_busy" as const;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "GeminiApiBusyError";
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class AiProvidersExhaustedError extends Error {
  readonly code = "ai_exhausted" as const;
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "AiProvidersExhaustedError";
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
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
  return /timeout|timed out|deadline|aborted|abort/i.test(blob);
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

async function callGeminiCore(
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
  maxOutputTokens: number,
): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
      maxOutputTokens,
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
    return text;
  } catch (err) {
    if (controller.signal.aborted) {
      const abortErr = new Error(
        `Gemini birincil deneme iptal edildi (${GEMINI_PRIMARY_ATTEMPT_MS}ms)`,
      );
      abortErr.name = "AbortError";
      throw abortErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Çift motorlu JSON: Gemini (max 15 sn) → timeout/iptal → OpenRouter yedek.
 */
export async function callGeminiJson(
  systemInstruction: string,
  userPrompt: string,
  temperature = 0.35,
  options?: CallGeminiJsonOptions,
): Promise<string> {
  const strictInstruction = `${systemInstruction}

${JSON_COMPLETION_GUARD}`;

  const augmentedSystem = augmentSystemInstruction(strictInstruction, {
    lite: options?.liteAugment,
  });
  const maxOutputTokens = GEMINI_MAX_OUTPUT_TOKENS;

  try {
    const text = await callGeminiCore(
      augmentedSystem,
      userPrompt,
      temperature,
      maxOutputTokens,
    );
    return cleanGeminiJsonText(text);
  } catch (geminiErr) {
    if (!isAiFallbackEligible(geminiErr)) {
      throw geminiErr;
    }

    if (!hasOpenRouterEnv()) {
      console.error("[ai] OpenRouter yedek yok (OPENROUTER_API_KEY eksik)");
      throw new GeminiApiBusyError(GEMINI_BUSY_USER_MESSAGE, { cause: geminiErr });
    }

    console.warn("[ai] Gemini 15sn içinde yanıt vermedi — OpenRouter devrede…", {
      reason: geminiErr instanceof Error ? geminiErr.message : String(geminiErr),
    });

    try {
      return await callOpenRouterJson(systemInstruction, userPrompt, temperature, {
        lite: options?.liteAugment,
        maxOutputTokens,
        timeoutMs: OPENROUTER_NEWS_FALLBACK_TIMEOUT_MS,
      });
    } catch (openRouterErr) {
      console.error("[ai] OpenRouter fallback başarısız:", openRouterErr);
      throw new AiProvidersExhaustedError(AI_PROVIDERS_EXHAUSTED_MESSAGE, {
        cause: { gemini: geminiErr, openRouter: openRouterErr },
      });
    }
  }
}
