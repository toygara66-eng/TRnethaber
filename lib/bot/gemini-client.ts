import { GoogleGenerativeAI } from "@google/generative-ai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

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

  const result = await model.generateContent(userPrompt);
  const text = result.response.text()?.trim();
  if (!text) {
    throw new Error("Gemini boş yanıt döndü");
  }
  return text;
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
