import { applyConstitutionRules, validateConstitution } from "@/lib/constitution/text";
import { callGeminiJson, parseJsonObject } from "@/lib/bot/gemini-client";
import { upsertExtractedEntities } from "@/lib/bot/persist-entities";
import { slugifyTitle } from "@/lib/slug";
import type { EntityType, EntityUpsertResult, ExtractedEntity } from "@/lib/bot/types";

const ENTITY_TYPES: EntityType[] = ["kisi", "takim", "kurum"];

const ENTITY_SYSTEM_INSTRUCTION = `Sen TRNETHABER semantik ağ editörüsün. Verilen haber metninde geçen en önemli varlıkları (kişi, kurum, takım) tespit et.

KESİN KURALLAR:
- Yalnızca metinde açıkça geçen varlıkları seç; en fazla 4 varlık.
- Rakamları ASLA sayıyla veya nokta/virgül ayraçlı yazma; kelimeyle yaz.
- Yüzde sembolü (%) ASLA kullanma; "yüzde 35" şeklinde yaz.
- Kurum adlarında kesme işareti kullanma.
- Uydurma bilgi ekleme; yalnızca haberde geçen bağlamı kullan.

JSON formatı:
{
  "entities": [
    {
      "name": "Tam resmi ad",
      "entity_type": "kisi | kurum | takim",
      "bio_content": "2-3 cümle biyografi",
      "anlik_durum_neden_gundemde": "Bu haber bağlamında neden gündemde"
    }
  ]
}`;

type GeminiEntitiesJson = {
  entities?: Array<{
    name?: string;
    entity_type?: string;
    bio_content?: string;
    anlik_durum_neden_gundemde?: string;
  }>;
};

function normalizeEntityType(raw: string): EntityType | null {
  const t = raw.trim().toLowerCase();
  if (t === "kisi" || t === "kişi" || t === "person") return "kisi";
  if (t === "kurum" || t === "institution" || t === "organization") return "kurum";
  if (t === "takim" || t === "takım" || t === "team") return "takim";
  return ENTITY_TYPES.includes(t as EntityType) ? (t as EntityType) : null;
}

type GeminiEntityRaw = NonNullable<GeminiEntitiesJson["entities"]>[number];

function finalizeEntity(raw: GeminiEntityRaw): ExtractedEntity | null {
  const name = applyConstitutionRules(String(raw.name ?? "").trim());
  const entity_type = normalizeEntityType(String(raw.entity_type ?? ""));
  const bio_content = applyConstitutionRules(String(raw.bio_content ?? "").trim());
  const anlik_durum_neden_gundemde = applyConstitutionRules(
    String(raw.anlik_durum_neden_gundemde ?? "").trim(),
  );

  if (!name || !entity_type || !bio_content || !anlik_durum_neden_gundemde) {
    return null;
  }

  const violations = [
    ...validateConstitution(name),
    ...validateConstitution(bio_content),
    ...validateConstitution(anlik_durum_neden_gundemde),
  ];
  if (violations.length > 0) return null;

  return {
    name,
    slug: slugifyTitle(name),
    entity_type,
    bio_content,
    anlik_durum_neden_gundemde,
    image_url: null,
  };
}

export async function extractEntitiesFromArticle(input: {
  title: string;
  spot: string;
  content: string;
  articleSlug: string;
}): Promise<ExtractedEntity[]> {
  const userPrompt = [
    "Aşağıdaki TRNETHABER haberinden semantik varlıkları çıkar.",
    "",
    `Haber slug: ${input.articleSlug}`,
    `Başlık: ${input.title}`,
    `Spot: ${input.spot}`,
    `Gövde: ${input.content}`,
  ].join("\n");

  const raw = await callGeminiJson(ENTITY_SYSTEM_INSTRUCTION, userPrompt, 0.3);
  const parsed = parseJsonObject<GeminiEntitiesJson>(raw);
  const list = Array.isArray(parsed.entities) ? parsed.entities : [];

  const seen = new Set<string>();
  const entities: ExtractedEntity[] = [];

  for (const item of list.slice(0, 4)) {
    const entity = finalizeEntity(item);
    if (!entity || seen.has(entity.slug)) continue;
    seen.add(entity.slug);
    entities.push(entity);
  }

  return entities;
}

export async function runEntityBotForArticle(input: {
  title: string;
  spot: string;
  content: string;
  articleSlug: string;
}): Promise<EntityUpsertResult[]> {
  const extracted = await extractEntitiesFromArticle(input);
  if (extracted.length === 0) return [];
  return upsertExtractedEntities(extracted);
}
