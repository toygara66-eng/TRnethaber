/**
 * Mock ajans teli — RSS başarısız olduğunda yedek (halüsinasyon yok).
 */

import type { AgencyWire } from "@/lib/bot/types";

export type { AgencyWire };

export const MOCK_AGENCY_WIRES: AgencyWire[] = [
  {
    id: "wire-tcmb-01",
    categorySlug: "ekonomi" as const,
    isBreaking: true,
    rawTitle: "TCMB politika faizini %50 artırdı",
    rawLead:
      "Türkiye Cumhuriyet Merkez Bankası'nın Politika Kurulu toplantısı sona erdi.",
    rawBody:
      "Karar metninde sıkılaştırma vurgusu öne çıktı. Borsa İstanbul gün içinde 15.350 puan bandında işlem gördü. Analistler enflasyon görünümünün %68 bandında kaldığını kaydetti.",
    sourceLabel: "Mock Ajans — Ekonomi Servisi",
  },
  {
    id: "wire-spor-01",
    categorySlug: "spor",
    isBreaking: false,
    rawTitle: "Süper Lig hafta sonu programı netleşti",
    rawLead: "TFF resmi sitesinde 4 maçın saatleri yayımlandı.",
    rawBody:
      "Kulüpler bilet satışlarında toplam 120.500 bilet hedefini paylaştı. Tribün doluluk beklentisi %78 olarak konuşuluyor.",
    sourceLabel: "Mock Ajans — Spor Servisi",
  },
  {
    id: "wire-gundem-01",
    categorySlug: "gundem",
    isBreaking: false,
    rawTitle: "Meclis komisyonunda düzenleme tasarısı görüşüldü",
    rawLead: "Komisyon toplantısında metin madde madde ele alındı.",
    rawBody:
      "İstanbul Büyükşehir Belediyesi'nin sunduğu bilgi notunda ulaşım yatırımlarının 2.400 sayfa olduğu belirtildi. Uzmanlar etkinin %12 civarında tartışıldığını ifade etti.",
    sourceLabel: "Mock Ajans — Gündem Servisi",
  },
];

let wireCursor = 0;

export function pickNextMockWire(): AgencyWire {
  const wire = MOCK_AGENCY_WIRES[wireCursor % MOCK_AGENCY_WIRES.length];
  wireCursor += 1;
  return wire;
}
