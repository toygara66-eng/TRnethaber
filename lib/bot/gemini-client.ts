import { GoogleGenerativeAI } from "@google/generative-ai";
import { cleanGeminiJsonText, parseJsonObject } from "@/lib/bot/ai-json-utils";
import { augmentSystemInstruction } from "@/lib/bot/editorial-ai-rules";
import { callOpenRouterJson, hasOpenRouterEnv } from "@/lib/bot/openrouter-client";

export { cleanGeminiJsonText, parseJsonObject } from "@/lib/bot/ai-json-utils";

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
export const GEMINI_REQUEST_TIMEOUT_MS = 90_000;

/** Cron / pipeline — her iki motor da başarısız */
export const GEMINI_BUSY_USER_MESSAGE =
  "Yapay zeka sunucuları meşgul, işlem atlandı. Bir sonraki döngüde tekrar denenecek.";

export const AI_PROVIDERS_EXHAUSTED_MESSAGE =
  "Gemini ve OpenRouter yedek motoru yanıt veremedi. Lütfen daha sonra tekrar deneyin.";

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

export function isAiTimeoutError(err: unknown): boolean {
  const blob =
    err instanceof Error
      ? `${err.message} ${err.name} ${err.cause instanceof Error ? err.cause.message : ""}`
      : String(err);
  const lower = blob.toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("deadline") ||
    lower.includes("aborterror") ||
    lower.includes("econnaborted") ||
    lower.includes("etimedout")
  );
}

export function isGeminiOverloadError(err: unknown): boolean {
  if (err instanceof GeminiApiBusyError) return true;

  const parts: string[] = [];
  if (err instanceof Error) {
    parts.push(err.message, err.name);
    const cause = err.cause;
    if (cause instanceof Error) parts.push(cause.message);
    else if (cause != null) parts.push(String(cause));
  } else {
    parts.push(String(err));
  }

  const blob = parts.join(" ").toLowerCase();
  return (
    blob.includes("503") ||
    blob.includes("service unavailable") ||
    blob.includes("high demand") ||
    blob.includes("overloaded") ||
    blob.includes("resource exhausted") ||
    blob.includes("429") ||
    blob.includes("too many requests") ||
    blob.includes("quota") ||
    blob.includes("rate limit") ||
    isAiTimeoutError(err)
  );
}

export function isGeminiBusyError(err: unknown): err is GeminiApiBusyError {
  return err instanceof GeminiApiBusyError || isGeminiOverloadError(err);
}

export function isAiFallbackEligible(err: unknown): boolean {
  return isGeminiBusyError(err) || isAiTimeoutError(err);
}

export function logGeminiBusy(err: unknown): void {
  console.error("Gemini API Meşgul:", err);
}

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY tanımlı değil");
  }
  return new GoogleGenerativeAI(apiKey);
}

export { GEMINI_STRICT_JSON_RULE } from "@/lib/bot/editorial-ai-rules";

async function callGeminiCore(
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
    },
  });

  const generate = model.generateContent(userPrompt);
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`Gemini zaman aşımı (${GEMINI_REQUEST_TIMEOUT_MS}ms)`)),
      GEMINI_REQUEST_TIMEOUT_MS,
    );
  });

  const result = await Promise.race([generate, timeout]);
  const text = result.response.text()?.trim();
  if (!text) {
    throw new Error("Gemini boş yanıt döndü");
  }
  return text;
}

/**
 * Çift motorlu JSON üretimi: önce Gemini, meşgul/kota/timeout → OpenRouter (ücretsiz).
 */
export async function callGeminiJson(
  systemInstruction: string,
  userPrompt: string,
  temperature = 0.35,
): Promise<string> {
  const augmentedSystem = augmentSystemInstruction(systemInstruction);

  try {
    const text = await callGeminiCore(augmentedSystem, userPrompt, temperature);
    return cleanGeminiJsonText(text);
  } catch (geminiErr) {
    if (!isAiFallbackEligible(geminiErr)) {
      throw geminiErr;
    }

    if (!hasOpenRouterEnv()) {
      console.error("[ai] OpenRouter yedek yok (OPENROUTER_API_KEY eksik)");
      throw new GeminiApiBusyError(GEMINI_BUSY_USER_MESSAGE, { cause: geminiErr });
    }

    console.warn("[ai] Gemini meşgul veya zaman aşımı — OpenRouter fallback devrede…", {
      reason: geminiErr instanceof Error ? geminiErr.message : String(geminiErr),
    });

    try {
      return await callOpenRouterJson(systemInstruction, userPrompt, temperature);
    } catch (openRouterErr) {
      console.error("[ai] OpenRouter fallback başarısız:", openRouterErr);
      throw new AiProvidersExhaustedError(AI_PROVIDERS_EXHAUSTED_MESSAGE, {
        cause: { gemini: geminiErr, openRouter: openRouterErr },
      });
    }
  }
}
