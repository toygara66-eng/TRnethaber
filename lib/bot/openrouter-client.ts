import {
  augmentSystemInstruction,
  type AugmentSystemOptions,
} from "@/lib/bot/editorial-ai-rules";
import { cleanGeminiJsonText } from "@/lib/bot/ai-json-utils";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const DEFAULT_OPENROUTER_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
] as const;

/** Gemini birincil deneme (15 sn) sonrası kalan Vercel bütçesi */
export const OPENROUTER_REQUEST_TIMEOUT_MS = 45_000;

export function getOpenRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY?.trim();
}

export function hasOpenRouterEnv(): boolean {
  return Boolean(getOpenRouterApiKey());
}

function resolveOpenRouterModels(): string[] {
  const primary = process.env.OPENROUTER_MODEL?.trim();
  if (primary) {
    return [primary, ...DEFAULT_OPENROUTER_MODELS.filter((m) => m !== primary)];
  }
  return [...DEFAULT_OPENROUTER_MODELS];
}

async function createOpenRouterClient(timeoutMs = OPENROUTER_REQUEST_TIMEOUT_MS) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY tanımlı değil");
  }

  const { OpenAI } = await import("openai");
  return new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey,
    timeout: timeoutMs,
  });
}

function extractChatText(content: unknown): string {
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const parts = content
      .map((part) => {
        if (typeof part === "object" && part && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join("\n").trim();
  }
  return "";
}

export function isOpenRouterRetryableError(err: unknown): boolean {
  const blob =
    err instanceof Error
      ? `${err.message} ${err.name} ${err.cause instanceof Error ? err.cause.message : ""}`
      : String(err);
  const lower = blob.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("503") ||
    lower.includes("502") ||
    lower.includes("rate") ||
    lower.includes("timeout") ||
    lower.includes("overloaded") ||
    lower.includes("no endpoints") ||
    lower.includes("capacity")
  );
}

/**
 * OpenRouter ücretsiz modeller — JSON haber çıktısı.
 * Sistem talimatına editoryal manifesto otomatik eklenir.
 */
export type CallOpenRouterJsonOptions = AugmentSystemOptions & {
  maxOutputTokens?: number;
  /** Haber botu yedek çağrısı — Gemini 15 sn sonrası kalan bütçe */
  timeoutMs?: number;
};

export async function callOpenRouterJson(
  systemInstruction: string,
  userPrompt: string,
  temperature = 0.35,
  options?: CallOpenRouterJsonOptions,
): Promise<string> {
  const totalTimeoutMs = options?.timeoutMs ?? OPENROUTER_REQUEST_TIMEOUT_MS;
  const deadline = Date.now() + totalTimeoutMs;
  const system = augmentSystemInstruction(systemInstruction, {
    lite: options?.lite,
  });
  const models = resolveOpenRouterModels();
  let lastError: unknown;
  const maxTokens = options?.maxOutputTokens ?? 8192;

  for (const model of models) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 2_000) {
      lastError = new Error("OpenRouter toplam süre bütçesi doldu");
      break;
    }

    try {
      const client = await createOpenRouterClient(remainingMs);
      const completion = await client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      });

      const text = extractChatText(completion.choices[0]?.message?.content);
      if (!text) {
        throw new Error(`OpenRouter (${model}) boş yanıt döndü`);
      }

      console.info(`[openrouter] Başarılı model: ${model}`);
      return cleanGeminiJsonText(text);
    } catch (err) {
      lastError = err;
      console.warn(`[openrouter] Model başarısız (${model}):`, err);
      if (!isOpenRouterRetryableError(err)) {
        break;
      }
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "OpenRouter tüm modellerde başarısız";
  throw new Error(message, { cause: lastError });
}
