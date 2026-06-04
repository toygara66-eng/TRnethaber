export function cleanGeminiJsonText(text: string): string {
  if (!text) return "";
  // Yapay zekanın eklediği markdown, json etiketleri ve sohbet fazlalıklarını temizler
  return text.replace(/```json/gi, '').replace(/
```/g, '').trim();
}
