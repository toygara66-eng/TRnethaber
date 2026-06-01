import axios from "axios";
import { XMLParser } from "fast-xml-parser";

export const GOOGLE_TRENDS_TR_RSS_URL = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=TR";
// Wikipedia TR'nin günlük en çok okunan maddelerini veren açık API kaynağı
const WIKIPEDIA_TR_MOST_READ_URL = "https://wikimedia.org/api/rest_v1/metrics/pageviews/top/wikipedia.org/tr/all-access/";

export type FetchKeywordsResult = {
  keywords: string[];
  feedUrl: string;
};

/**
 * TRNETHABER Hibrit İstihbarat Motoru
 * Hem Google Trends'ten anlık popüler konuları hem de Wikipedia'dan en çok aratılan insan isimlerini toplar.
 */
export async function fetchGoogleTrendKeywords(limit = 15): Promise<FetchKeywordsResult> {
  const keywordSet = new Set<string>();

  // ---- 1. MOTOR: GOOGLE TRENDS VERİLERİNİ ÇEKME ----
  try {
    const response = await axios.get(GOOGLE_TRENDS_TR_RSS_URL, {
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (response.data) {
      const parser = new XMLParser();
      const jsonObj = parser.parse(response.data);
      const items = jsonObj?.rss?.channel?.item;

      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.title) {
            const cleanKey = String(item.title).trim();
            if (cleanKey) keywordSet.add(cleanKey);
          }
        }
      } else if (items && items.title) {
        keywordSet.add(String(items.title).trim());
      }
    }
  } catch (error) {
    console.error("[istihbarat-motoru] Google Trends RSS çekilemedi:", error);
  }

  // ---- 2. MOTOR: WIKIPEDIA TR EN ÇOK OKUNANLAR VERİLERİNİ ÇEKME ----
  try {
    // Dinamik olarak dünün veya bugünün tarihini YYYY/MM/DD formatında ayarlıyoruz
    const now = new Date();
    now.setDate(now.getDate() - 1); // En kararlı veri dün kümesinde olduğu için dünü sorguluyoruz
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const wpUrl = `${WIKIPEDIA_TR_MOST_READ_URL}${year}/${month}/${day}`;
    
    const wpResponse = await axios.get(wpUrl, {
      timeout: 8000,
      headers: {
        "User-Agent": "TRNETHABER_Bot/2.0 (admin@trnethaber.com)",
      },
    });

    const articles = wpResponse?.data?.items?.[0]?.articles;
    if (Array.isArray(articles)) {
      // Ana sayfa, arama, listeler gibi insan ismi olmayan Wikipedia sabit başlıklarını eliyoruz
      const filterOut = [
        "Ana_Sayfa", "Özel:", "Kategori:", "Dosya:", "Vikipedi:", "Yardım:", 
        "Portal:", "Anasayfa", "Tartışma:", "Kullanıcı:"
      ];

      for (const art of articles) {
        const pageTitle = art.article ? String(art.article).replace(/_/g, " ").trim() : "";
        
        // Filtrelere takılmıyorsa ve çok kısa/anlamsız değilse havuzumuza ekle
        if (pageTitle && pageTitle.length > 2 && !filterOut.some(f => pageTitle.includes(f))) {
          // Sayısal tarih veya sadece yıl içeren sayfaları ele (Örn: 2026, 1 Haziran vb.)
          if (!/^\d+$/.test(pageTitle)) {
            keywordSet.add(pageTitle);
          }
        }
      }
    }
  } catch (error) {
    console.error("[istihbarat-motoru] Wikipedia TR verileri çekilemedi:", error);
  }

  // ---- Havuzları Birleştirme ve Sınırlandırma ----
  const allKeywords = Array.from(keywordSet).slice(0, limit);

  console.info(`[istihbarat-motoru] Toplam ${allKeywords.length} adet hibrit anahtar kelime üretim bandına gönderiliyor.`);

  return {
    keywords: allKeywords,
    feedUrl: GOOGLE_TRENDS_TR_RSS_URL,
  };
}
