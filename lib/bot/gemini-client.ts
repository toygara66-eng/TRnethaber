import { GoogleGenerativeAI } from "@google/generative-ai";
import { cleanGeminiJsonText, parseJsonObject } from "@/lib/bot/ai-json-utils";
import { augmentSystemInstruction } from "@/lib/bot/editorial-ai-rules";
import { callOpenRouterJson, hasOpenRouterEnv } from "@/lib/bot/openrouter-client";

export { cleanGeminiJsonText, parseJsonObject } from "@/lib/bot/ai-json-utils";
export { GEMINI_STRICT_JSON_RULE } from "@/lib/bot/editorial-ai-rules";

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

/** Model çıktı üst sınırı — kesik JSON'u önlemek için sabit */
export const GEMINI_MAX_OUTPUT_TOKENS = 8192;

/** Haber başına Gemini birincil deneme — süre dolunca OpenRouter */
export const GEMINI_PRIMARY_ATTEMPT_MS = 18_000;

/** 503/429 sonrası hızlı Gemini yedek denemeleri */
export const GEMINI_RETRY_ATTEMPT_MS = 7_000;

/** Gemini timeout sonrası OpenRouter yedek toplam üst sınırı (pipeline 50 sn ile uyumlu) */
export const OPENROUTER_NEWS_FALLBACK_TIMEOUT_MS = 28_000;

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

function resolveGeminiModelChain(): string[] {
  const primary = GEMINI_MODEL;
  const extras = ["gemini-2.0-flash", "gemini-1.5-flash-8b"];
  return [primary, ...extras.filter((m) => m !== primary)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiCore(
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
  maxOutputTokens: number,
  options?: { model?: string; timeoutMs?: number },
): Promise<string> {
  const genAI = getGeminiClient();
  const modelName = options?.model ?? GEMINI_MODEL;
  const timeoutMs = options?.timeoutMs ?? GEMINI_PRIMARY_ATTEMPT_MS;
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
      maxOutputTokens,
    },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await model.generateContent(userPrompt, {
      signal: controller.signal,
    });
    const text = result.response.text()?.trim();
    if (!text) throw new Error("Gemini boş yanıt döndü");
    return text;
  } catch (err) {
    if (controller.signal.aborted) {
      const abortErr = new Error(`Gemini deneme iptal edildi (${timeoutMs}ms, ${modelName})`);
      abortErr.name = "AbortError";
      throw abortErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function callGeminiWithRetries(
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
  maxOutputTokens: number,
): Promise<string> {
  const models = resolveGeminiModelChain();
  let lastErr: unknown;

  for (let i = 0; i < models.length; i++) {
    const timeoutMs = i === 0 ? GEMINI_PRIMARY_ATTEMPT_MS : GEMINI_RETRY_ATTEMPT_MS;
    if (i > 0) {
      await sleep(2_000);
      console.warn(`[ai] Gemini yoğunluk/timeout — yedek model: ${models[i]}`);
    }
    try {
      return await callGeminiCore(systemInstruction, userPrompt, temperature, maxOutputTokens, {
        model: models[i],
        timeoutMs,
      });
    } catch (err) {
      lastErr = err;
      const canRetry = i < models.length - 1 && isAiFallbackEligible(err);
      if (!canRetry) break;
    }
  }

  throw lastErr;
}

/**
 * Çift motorlu JSON: Gemini (birincil bütçe) → timeout/iptal → OpenRouter yedek.
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
  const maxOutputTokens = options?.maxOutputTokens ?? GEMINI_MAX_OUTPUT_TOKENS;

  try {
    const text = await callGeminiWithRetries(
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

    console.warn("[ai] Gemini tüm denemeler başarısız — OpenRouter devrede…", {
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
