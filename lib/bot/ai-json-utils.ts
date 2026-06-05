/** Yapay zekanın markdown işaretlerini ve geveze sohbet metinlerini temizler */
export function cleanGeminiJsonText(text: string): string {
  if (!text) return "";

  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else {
    startIdx = Math.max(firstBrace, firstBracket);
  }

  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  const endIdx = Math.max(lastBrace, lastBracket);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  } else if (startIdx !== -1) {
    cleaned = cleaned.substring(startIdx);
  }

  return cleaned;
}

function scanJsonStructure(text: string): {
  stack: string[];
  inString: boolean;
} {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      const top = stack[stack.length - 1];
      if (top === ch) stack.pop();
    }
  }

  return { stack, inString };
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Kesik/yarım kalan model JSON çıktısını kapatıcı parantez ekleyerek onarmayı dener. */
function recoverTruncatedJsonObject(cleanedText: string): unknown | null {
  const trimmed = cleanedText.trim();
  if (!trimmed.startsWith("{")) return null;

  const direct = tryParseJson(trimmed);
  if (direct !== null) return direct;

  const endsClosed = trimmed.endsWith("}") || trimmed.endsWith("]");
  if (!endsClosed) {
    const suffixes = ["}", "\"}", "]}", "\"]}"];
    for (const suffix of suffixes) {
      const parsed = tryParseJson(trimmed + suffix);
      if (parsed !== null) {
        console.warn("[ai-json] Kesik JSON basit kapatma ile onarıldı");
        return parsed;
      }
    }
  }

  const { stack, inString } = scanJsonStructure(trimmed);
  let repaired = trimmed;
  if (inString) repaired += '"';

  repaired = repaired.replace(/[,:]\s*$/, "");

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = repaired + stack.slice().reverse().join("");
    const parsed = tryParseJson(candidate);
    if (parsed !== null) {
      console.warn("[ai-json] Kesik JSON parantez onarımı ile ayrıştırıldı");
      return parsed;
    }

    const stripped = repaired.replace(/,?\s*"[^"]*"\s*:\s*"?[^"]*$/, "");
    if (stripped === repaired || stripped.length < 2) break;
    repaired = stripped;
  }

  return null;
}

function extractJsonStringValue(text: string, key: string): string | null {
  const marker = `"${key}"`;
  const start = text.indexOf(marker);
  if (start === -1) return null;

  let i = start + marker.length;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  if (text[i] !== ":") return null;
  i += 1;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  if (text[i] !== '"') return null;
  i += 1;

  let value = "";
  let escaped = false;
  while (i < text.length) {
    const ch = text[i];
    if (escaped) {
      value += ch;
      escaped = false;
      i += 1;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      i += 1;
      continue;
    }
    if (ch === '"') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    value += ch;
    i += 1;
  }

  const trimmed = value.trim();
  return trimmed.length >= 3 ? trimmed : null;
}

function extractJsonNumberValue(text: string, key: string): number | null {
  const match = new RegExp(`"${key}"\\s*:\\s*(\\d+(?:\\.\\d+)?)`).exec(text);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/** Kesik JSON'dan tamamlanmış string/number alanlarını çıkarır */
export function extractPartialJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = cleanGeminiJsonText(raw);
  if (!cleaned.includes("{")) return null;

  const obj: Record<string, unknown> = {};
  for (const key of ["title", "summary", "categorySlug", "category"]) {
    const val = extractJsonStringValue(cleaned, key);
    if (val) obj[key] = val;
  }

  const score = extractJsonNumberValue(cleaned, "importance_score");
  if (score !== null) obj.importance_score = score;

  const kwMatch = /"keywords"\s*:\s*\[([\s\S]*?)(?:\]|$)/.exec(cleaned);
  if (kwMatch) {
    const items: string[] = [];
    const kwRe = /"((?:\\.|[^"\\])*)"/g;
    let kwItem = kwRe.exec(kwMatch[1]);
    while (kwItem) {
      const word = kwItem[1].replace(/\\"/g, '"').trim();
      if (word) items.push(word);
      kwItem = kwRe.exec(kwMatch[1]);
    }
    if (items.length > 0) obj.keywords = items;
  }

  return Object.keys(obj).length > 0 ? obj : null;
}

/** Temizlenmiş metni güvenli bir şekilde JSON objesine dönüştürür */
export function parseJsonObject<T extends Record<string, unknown>>(raw: string): T {
  const cleanedText = cleanGeminiJsonText(raw);
  let parsed: unknown = tryParseJson(cleanedText);

  // Otomatik onarım: parse başarısızsa eksik '}' / ']' ile ikinci deneme
  if (parsed === null) {
    parsed = recoverTruncatedJsonObject(cleanedText);
  }

  if (parsed === null) {
    const partial = extractPartialJsonObject(raw);
    if (partial) {
      console.warn("[ai-json] Tam parse başarısız — kısmi alan çıkarımı");
      return partial as T;
    }
  }

  if (parsed === null) {
    const isTruncated =
      !cleanedText.trim().endsWith("}") && !cleanedText.trim().endsWith("]");
    const previewStart = cleanedText.substring(0, 100).replace(/\n/g, " ");
    const previewEnd =
      cleanedText.length > 100
        ? cleanedText.substring(cleanedText.length - 100).replace(/\n/g, " ")
        : "";
    const errorMessage = isTruncated
      ? "AI JSON çıktısı yarıda kesilmiş ve onarılamadı"
      : "AI JSON çıktısı ayrıştırılamadı";
    throw new Error(`${errorMessage} | BAŞI: ${previewStart}... | SONU: ...${previewEnd}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      "AI yanıtı geçerli bir JSON nesnesi değil. Gelen Metin: " +
        cleanedText.substring(0, 300),
    );
  }

  return parsed as T;
}
