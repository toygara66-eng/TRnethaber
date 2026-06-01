import axios from "axios";
import { XMLParser } from "fast-xml-parser";

export const GOOGLE_TRENDS_TR_RSS_URL = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=TR";
const WIKIPEDIA_TR_MOST_READ_URL = "https://wikimedia.org/api/rest_v1/metrics/pageviews/top/wikipedia.org/tr/all-access/";

export type FetchKeywordsResult = {
  keywords: string[];
  feedUrl: string;
};

/**
 * TRNETHABER Hibrit İstihbarat Motoru (Zırhlı Versiyon)
 */
export async function fetchGoogleTrendKeywords(limit = 15): Promise<FetchKeywordsResult> {
  const keywordSet = new Set<string>();

  // ---- 1. MOTOR: GOOGLE TRENDS (Gerçek Tarayıcı Maskesi) ----
  try {
    const response = await axios.get(GOOGLE_TRENDS_TR_RSS_URL, {
      timeout: 10000,
      headers: {
        // Vercel IP'sini gizlemek için tam Chrome maskesi
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml",
        "Cache-Control": "no-cache",
      },
    });

    if (response.data) {
      const parser = new XMLParser();
      const jsonObj = parser.parse(response.data);
      const items = jsonObj?.rss?.channel?.item || [];
      const itemList = Array.isArray(items) ? items : [items];
      
      for (const item of itemList) {
        if (item?.title) {
          keywordSet.add(String(item.title).trim());
        }
      }
    }
  } catch (error) {
    console.error("[istihbarat-motoru] Google Trends verisi çekilirken bloklandı veya zaman aşımı yaşandı.");
  }

  // ---- 2. MOTOR: WIKIPEDIA TR (Gerçek Tarayıcı Maskesi) ----
  try {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const wpUrl = `${WIKIPEDIA_TR_MOST_READ_URL}${year}/${month}/${day}`;
    
    const wpResponse = await axios.get(wpUrl, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    const articles = wpResponse?.data?.items?.[0]?.articles || [];
    const filterOut = [
      "Ana_Sayfa", "Özel:", "Kategori:", "Dosya:", "Vikipedi:", "Yardım:", 
      "Portal:", "Anasayfa", "Tartışma:", "Kullanıcı:"
    ];

    for (const art of articles) {
      const pageTitle = art.article ? String(art.article).replace(/_/g, " ").trim() : "";
      if (pageTitle && pageTitle.length > 2 && !filterOut.some(f => pageTitle.includes(f))) {
        if (!/^\d+$/.test(pageTitle)) {
          keywordSet.add(pageTitle);
        }
      }
    }
  } catch (error) {
    console.error("[istihbarat-motoru] Wikipedia TR verisi çekilirken bloklandı.");
  }

  // ---- 🚨 3. MOTOR: ACİL DURUM YEDEĞİ (FALLBACK) ----
  // Eğer hem Google hem Wikipedia Vercel'i tamamen engellerse, motor ASLA 0 dönmez.
  // Gündemden düşmeyen 'Evergreen' isimleri sisteme besler.
  if (keywordSet.size === 0) {
    console.warn("[istihbarat-motoru] API'ler bloklandı! Acil durum yedek listesi devreye giriyor.");
    const fallbackKeywords = [
      "Ali Koç", "Dursun Özbek", "Fatih Karahan", "Yılmaz Erdoğan", 
      "Kıvanç Tatlıtuğ", "Acun Ilıcalı", "Serenay Sarıkaya", "Hande Erçel",
      "Arda Güler", "Hakan Çalhanoğlu"
    ];
    fallbackKeywords.forEach(k => keywordSet.add(k));
  }

  const allKeywords = Array.from(keywordSet).slice(0, limit);

  return {
    keywords: allKeywords,
    feedUrl: GOOGLE_TRENDS_TR_RSS_URL,
  };
}
