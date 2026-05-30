/**
 * TRNETHABER — Agent Merkezi (AI Coordinator)
 * Google AI Ultra uyumlu çok ajanlı iş akışı.
 *
 * Akış:
 * 1) Hukuk Müşaviri Ajan — risk taraması
 * 2) Yayın Yönetmeni Ajan — rakip marka/ajans temizliği
 * 3) Görsel Stratejist — search | generate kararı (JSON)
 *
 * Defensive: her ajan hata verirse orijinal metin korunur; sistem durmaz.
 */

import { GEMINI_WRITING_RULES } from "@/lib/bot/gemini-writing-rules";
import { applyConstitutionRules } from "@/lib/constitution/text";
import { stripArticleContentForPersist } from "@/lib/bot/strip-article-content";
import { callGeminiJson, parseJsonObject } from "@/lib/bot/gemini-client";
import type { ImageStrategyMode } from "@/utils/image-agent";

export type ArticleDraft = {
  title: string;
  content: string;
  spot?: string;
};

export type AgentId =
  | "legal_counsel"
  | "publishing_editor"
  | "visual_strategist";

export type ImageStrategyDecision = {
  image_strategy: ImageStrategyMode;
  image_prompt: string;
};

export type AgentStepResult = {
  agent: AgentId;
  ok: boolean;
  content: string;
  title: string;
  spot: string;
  warnings: string[];
  error?: string;
  durationMs: number;
};

export type CoordinatorResult = {
  ok: boolean;
  title: string;
  content: string;
  spot: string;
  imageStrategy: ImageStrategyDecision;
  steps: AgentStepResult[];
  usedFallback: boolean;
};

type AgentJsonResponse = {
  approved?: boolean;
  title?: string;
  content?: string;
  spot?: string;
  warnings?: string[];
  blocked_reasons?: string[];
};

type VisualStrategistJson = {
  image_strategy?: string;
  image_prompt?: string;
};

const LEGAL_COUNSEL_SYSTEM = `Sen TRNETHABER Hukuk Müşaviri Ajanısın.
Görev: Haber taslağında ifade özgürlüğü sınırında hukuki risk taraması yap.
- Hakaret, ağır suçlama, doğrulanmamış iddia, kişilik hakları ihlali risklerini işaretle.
- Gerekirse metni yumuşat ve düzelt; TRNETHABER anayasasına uy (yüzde sembolü yok).
${GEMINI_WRITING_RULES}
JSON çıktı: { "approved": boolean, "title": string, "content": string, "spot": string, "warnings": string[], "blocked_reasons": string[] }`;

const PUBLISHING_EDITOR_SYSTEM = `Sen TRNETHABER Yayın Yönetmeni Ajanısın.
Görev: Rakip medya markalarını, ajans isimlerini ve gereksiz dış referansları temizle.
- Anadolu Ajansı, İHA, Reuters vb. kaynak adlarını metinden çıkar veya nötrleştir.
- TRNETHABER üslubunu koru; anayasa kurallarına uy (yüzde sembolü yok).
- content alanına asla img, picture, figure veya Markdown görsel ekleme; yalnızca metin HTML (p, h2, ul, li, strong).
${GEMINI_WRITING_RULES}
JSON çıktı: { "approved": boolean, "title": string, "content": string, "spot": string, "warnings": string[] }`;

const VISUAL_STRATEGIST_SYSTEM = `Sen TRNETHABER Görsel Stratejist Ajanısın.
Görev: Haber metnini analiz edip kapak görseli stratejisi belirle.

Kurallar:
- Belirli bir kişi, siyasetçi, sporcu, ünlü veya tanınmış figür geçiyorsa: "image_strategy": "search"
  "image_prompt" alanına İngilizce veya Türkçe net arama kelimeleri yaz (ör. "Recep Tayyip Erdogan official portrait press").
- Para, ekonomi, borsa, soyut kavram, olay yeri, doğa, teknoloji gibi konularda: "image_strategy": "generate"
  "image_prompt" alanına Imagen için fotogerçekçi İngilizce prompt yaz (ör. "Photorealistic close-up of Turkish Lira banknotes with dynamic studio lighting, editorial news style, no text, no faces").
- Prompt tek satır, 240 karakteri geçmesin.
- Sadece JSON döndür: { "image_strategy": "search" | "generate", "image_prompt": string }`;

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function safeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((w): w is string => typeof w === "string" && w.trim().length > 0);
}

function applyConstitutionToDraft(draft: ArticleDraft): ArticleDraft {
  return {
    title: applyConstitutionRules(draft.title),
    content: stripArticleContentForPersist(applyConstitutionRules(draft.content)),
    spot: applyConstitutionRules(draft.spot ?? ""),
  };
}

function defaultImageStrategy(draft: ArticleDraft): ImageStrategyDecision {
  const personPattern =
    /\b(erdoğan|erdogan|cumhurbaşkan|bakan|milletvekili|futbolcu|ceo|ünü|sanatçı)\b/i;
  const isPerson = personPattern.test(`${draft.title} ${draft.content}`);

  if (isPerson) {
    return {
      image_strategy: "search",
      image_prompt: `${draft.title} turkey news portrait press photo`,
    };
  }

  return {
    image_strategy: "generate",
    image_prompt: `Photorealistic editorial news illustration about ${draft.title}, dramatic lighting, no text, no watermark, 16:9`,
  };
}

async function runAgent(
  agent: AgentId,
  systemInstruction: string,
  draft: ArticleDraft,
): Promise<AgentStepResult> {
  const started = Date.now();
  const fallback: AgentStepResult = {
    agent,
    ok: false,
    title: draft.title,
    content: draft.content,
    spot: draft.spot ?? "",
    warnings: [],
    durationMs: 0,
  };

  try {
    const userPrompt = JSON.stringify({
      title: draft.title,
      content: draft.content,
      spot: draft.spot ?? "",
    });

    const raw = await callGeminiJson(systemInstruction, userPrompt, 0.25);
    const parsed = parseJsonObject<AgentJsonResponse>(raw);

    const blocked = safeWarnings(parsed.blocked_reasons);
    const approved = parsed.approved !== false && blocked.length === 0;

    const result: AgentStepResult = {
      agent,
      ok: approved,
      title: safeString(parsed.title, draft.title),
      content: safeString(parsed.content, draft.content),
      spot: safeString(parsed.spot, draft.spot ?? ""),
      warnings: [...safeWarnings(parsed.warnings), ...blocked],
      durationMs: Date.now() - started,
    };

    return {
      ...result,
      title: applyConstitutionRules(result.title),
      content: applyConstitutionRules(result.content),
      spot: applyConstitutionRules(result.spot),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ajan çalıştırılamadı";
    console.error(`[ai-coordinator] ${agent}`, err);
    return {
      ...fallback,
      error: message,
      durationMs: Date.now() - started,
    };
  }
}

async function resolveImageStrategy(draft: ArticleDraft): Promise<{
  strategy: ImageStrategyDecision;
  step: AgentStepResult;
}> {
  const started = Date.now();
  const fallback = defaultImageStrategy(draft);

  try {
    const userPrompt = JSON.stringify({
      title: draft.title,
      content: draft.content.slice(0, 4000),
      spot: draft.spot ?? "",
    });

    const raw = await callGeminiJson(VISUAL_STRATEGIST_SYSTEM, userPrompt, 0.2);
    const parsed = parseJsonObject<VisualStrategistJson>(raw);

    const mode: ImageStrategyMode =
      parsed.image_strategy === "generate" ? "generate" : "search";

    const strategy: ImageStrategyDecision = {
      image_strategy: mode,
      image_prompt: safeString(parsed.image_prompt, fallback.image_prompt).slice(0, 240),
    };

    return {
      strategy,
      step: {
        agent: "visual_strategist",
        ok: true,
        title: draft.title,
        content: draft.content,
        spot: draft.spot ?? "",
        warnings: [],
        durationMs: Date.now() - started,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Görsel strateji üretilemedi";
    console.warn("[ai-coordinator] visual_strategist fallback:", err);
    return {
      strategy: fallback,
      step: {
        agent: "visual_strategist",
        ok: false,
        title: draft.title,
        content: draft.content,
        spot: draft.spot ?? "",
        warnings: [],
        error: message,
        durationMs: Date.now() - started,
      },
    };
  }
}

/**
 * Ana koordinatör: Hukuk → Yayın Yönetmeni → Görsel Stratejist.
 */
export async function processArticleWithAgents(
  input: ArticleDraft,
): Promise<CoordinatorResult> {
  const original = applyConstitutionToDraft(input);
  const steps: AgentStepResult[] = [];

  let working: ArticleDraft = { ...original };

  const legal = await runAgent("legal_counsel", LEGAL_COUNSEL_SYSTEM, working);
  steps.push(legal);

  if (legal.ok) {
    working = {
      title: legal.title,
      content: legal.content,
      spot: legal.spot,
    };
  } else {
    console.warn("[ai-coordinator] Hukuk ajanı fallback:", legal.error ?? legal.warnings);
  }

  let publishing: AgentStepResult;
  try {
    publishing = await Promise.resolve(
      runAgent("publishing_editor", PUBLISHING_EDITOR_SYSTEM, working),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yayın ajanı başlatılamadı";
    console.error("[ai-coordinator] publishing_editor outer", err);
    publishing = {
      agent: "publishing_editor",
      ok: false,
      title: working.title,
      content: working.content,
      spot: working.spot ?? "",
      warnings: [],
      error: message,
      durationMs: 0,
    };
  }
  steps.push(publishing);

  let finalTitle = working.title;
  let finalContent = working.content;
  let finalSpot = working.spot ?? "";

  if (publishing.ok) {
    finalTitle = publishing.title;
    finalContent = publishing.content;
    finalSpot = publishing.spot;
  } else {
    console.warn("[ai-coordinator] Yayın ajanı fallback:", publishing.error ?? publishing.warnings);
  }

  const finalizedDraft: ArticleDraft = {
    title: applyConstitutionRules(finalTitle),
    content: applyConstitutionRules(finalContent),
    spot: applyConstitutionRules(finalSpot),
  };

  const { strategy: imageStrategy, step: visualStep } =
    await resolveImageStrategy(finalizedDraft);
  steps.push(visualStep);

  const usedFallback =
    !legal.ok || !publishing.ok || !visualStep.ok;
  const anyContent = finalizedDraft.content.trim().length > 0;

  return {
    ok: anyContent,
    title: finalizedDraft.title,
    content: finalizedDraft.content,
    spot: finalizedDraft.spot ?? "",
    imageStrategy,
    steps,
    usedFallback,
  };
}
