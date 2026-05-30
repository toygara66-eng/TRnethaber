import { GoogleGenerativeAI } from "@google/generative-ai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

/** Cron / pipeline — kullanıcıya dönen zarif atlama mesajı */
export const GEMINI_BUSY_USER_MESSAGE =
  "Yapay zeka sunucuları meşgul, işlem atlandı. Bir sonraki döngüde tekrar denenecek.";

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
    blob.includes("too many requests")
  );
}

export function isGeminiBusyError(err: unknown): err is GeminiApiBusyError {
  return err instanceof GeminiApiBusyError || isGeminiOverloadError(err);
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

export async function callGeminiJson(
  systemInstruction: string,
  userPrompt: string,
  temperature = 0.35,
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

  try {
    const result = await model.generateContent(userPrompt);
    const text = result.response.text()?.trim();
    if (!text) {
      throw new Error("Gemini boş yanıt döndü");
    }
    return text;
  } catch (err) {
    if (isGeminiOverloadError(err)) {
      throw new GeminiApiBusyError(GEMINI_BUSY_USER_MESSAGE, { cause: err });
    }
    throw err;
  }
}

export function parseJsonObject<T extends Record<string, unknown>>(raw: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini JSON çıktısı ayrıştırılamadı");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Gemini yanıtı geçerli bir JSON nesnesi değil");
  }
  return parsed as T;
}
