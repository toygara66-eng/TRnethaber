import { NextResponse } from "next/server";
import { GEMINI_MODEL, getGeminiClient } from "@/lib/bot/gemini-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TEST_PROMPT =
  "Merhaba, ben TRNETHABER. Ultra motorlar tam kapasite çalışıyor mu?";

export async function GET() {
  return runUltraTest();
}

export async function POST() {
  return runUltraTest();
}

async function runUltraTest() {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const result = await model.generateContent(TEST_PROMPT);
    const reply = result.response.text()?.trim();

    if (!reply) {
      return NextResponse.json(
        {
          ok: false,
          error: "Gemini boş yanıt döndü",
          prompt: TEST_PROMPT,
          model: GEMINI_MODEL,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      prompt: TEST_PROMPT,
      model: GEMINI_MODEL,
      reply,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ultra test başarısız";
    console.error("[test-ultra]", err);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        prompt: TEST_PROMPT,
        model: GEMINI_MODEL,
      },
      { status: 500 },
    );
  }
}
