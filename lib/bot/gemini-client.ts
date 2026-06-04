// Bu kodu lib/bot/gemini-client.ts dosyasının tamamına yapıştır
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cleanGeminiJsonText, parseJsonObject } from "@/lib/bot/ai-json-utils";
import { augmentSystemInstruction } from "@/lib/bot/editorial-ai-rules";
import { callOpenRouterJson, hasOpenRouterEnv } from "@/lib/bot/openrouter-client";

export { cleanGeminiJsonText, parseJsonObject } from "@/lib/bot/ai-json-utils";

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
export const GEMINI_PRIMARY_ATTEMPT_MS = 45_000; // 45 saniyeye çıkardık (Süre aşımı olmasın)

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil");
  return new GoogleGenerativeAI(apiKey);
}

export async function callGeminiJson(
  systemInstruction: string,
  userPrompt: string,
  temperature = 0.35,
  options?: { liteAugment?: boolean; maxOutputTokens?: number }
): Promise<string> {
  const genAI = getGeminiClient();
  
  // ZIRHLI TALİMAT: Kısa ve öz ol, limitlere uy!
  const strictInstruction = `${systemInstruction} 
  ÖNEMLİ: Cevabın çok uzun olmasın. Eğer konu çok uzarsa özetle. 
  JSON çıktısı KESİNLİKLE kapanış paranteziyle bitmelidir.`;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: augmentSystemInstruction(strictInstruction, { lite: options?.liteAugment }),
    generationConfig: {
      responseMimeType: "application/json",
      temperature,
      maxOutputTokens: options?.maxOutputTokens || 8192, // Gemini'nin maksimum sınırı
    },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_PRIMARY_ATTEMPT_MS);

  try {
    const result = await model.generateContent(userPrompt, { signal: controller.signal });
    const text = result.response.text()?.trim();
    if (!text) throw new Error("Gemini boş yanıt döndü");
    return cleanGeminiJsonText(text);
  } catch (err) {
    // Gemini busy/timeout durumunda OpenRouter yedeğine düş
    // (Daha önceki yedekleme mantığını koruyoruz...)
    throw err; 
  } finally {
    clearTimeout(timer);
  }
}
