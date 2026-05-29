import { finalizeAiImagePrompt } from "@/lib/bot/ai-image-prompt";
import { callGeminiJson, parseJsonObject } from "@/lib/bot/gemini-client";

const IMAGE_PROMPT_SYSTEM = `You are a senior photojournalism art director.
Given a Turkish news headline and summary, write ONE detailed English prompt for a realistic editorial news photograph.

Rules:
- Photorealistic, news wire / Reuters style, 16:9 landscape composition
- No text, logos, watermarks, or UI overlays in the image
- Reflect the specific event, location type, and mood from the story
- Output ONLY valid JSON: { "prompt": "your English prompt here" }`;

type PromptJson = { prompt?: string };

export async function generateEditorialImagePrompt(input: {
  title: string;
  summary: string;
  keywords?: string[];
}): Promise<string> {
  const userPrompt = [
    `Headline: ${input.title}`,
    `Summary: ${input.summary}`,
    input.keywords?.length ? `Keywords: ${input.keywords.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callGeminiJson(IMAGE_PROMPT_SYSTEM, userPrompt, 0.45);
  const parsed = parseJsonObject<PromptJson>(raw);
  const prompt = parsed.prompt?.trim();

  if (!prompt || prompt.length < 24) {
    throw new Error("Gemini görsel promptu üretilemedi");
  }

  return finalizeAiImagePrompt(prompt).slice(0, 900);
}
