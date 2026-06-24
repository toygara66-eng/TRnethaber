import { BOT_RSS_CATEGORY_SLUGS, type BotRssCategorySlug } from "@/lib/data/core-categories";

/**
 * MEGA RSS HAVUZU — Karanlık Fabrika hammadde kaynakları
 */
export const RSS_CATEGORY_KEYS = BOT_RSS_CATEGORY_SLUGS;

export type RssCategoryKey = BotRssCategorySlug;

export const RSS_FEED_POOL: Record<RssCategoryKey, readonly string[]> = {
  gundem: [
    "https://www.trthaber.com/manset_articles.rss",
    "https://www.ntv.com.tr/gundem.rss",
    "https://www.haberturk.com/rss",
    "https://www.sabah.com.tr/rss/gundem.xml",
    "https://www.hurriyet.com.tr/rss/gundem",
    "https://www.milliyet.com.tr/rss/rssNew/gundemRss.xml",
    "https://www.cnnturk.com/feed/rss/gundem/news",
    "https://www.ensonhaber.com/rss/ensonhaber.xml",
    "https://www.cumhuriyet.com.tr/rss",
    "https://www.sozcu.com.tr/rss/gundem.xml",
  ],
  ekonomi: [
    "https://www.bloomberght.com/rss",
    "https://www.trthaber.com/ekonomi_articles.rss",
    "https://www.ntv.com.tr/ekonomi.rss",
    "https://www.haberturk.com/rss/ekonomi.xml",
    "https://www.sabah.com.tr/rss/ekonomi.xml",
    "https://www.hurriyet.com.tr/rss/ekonomi",
    "https://www.milliyet.com.tr/rss/rssNew/ekonomiRss.xml",
    "https://www.cnnturk.com/feed/rss/ekonomi/news",
    "https://www.dunya.com/rss",
    "https://www.sozcu.com.tr/rss/ekonomi.xml",
  ],
  spor: [
    "https://www.ntvspor.net/rss",
    "https://www.trtspor.com.tr/rss/manset.rss",
    "https://www.haberturk.com/rss/spor.xml",
    "https://www.sabah.com.tr/rss/spor.xml",
    "https://www.hurriyet.com.tr/rss/spor",
    "https://www.milliyet.com.tr/rss/rssNew/skorerRss.xml",
    "https://www.fotomac.com.tr/rss/anasayfa.xml",
    "https://www.fanatik.com.tr/rss",
    "https://www.cnnturk.com/feed/rss/spor/news",
    "https://www.aspor.com.tr/rss/anasayfa.xml",
  ],
  teknoloji: [
    "https://www.donanimhaber.com/rss/tum/",
    "https://shiftdelete.net/feed",
    "https://www.webtekno.com/rss.xml",
    "https://www.trthaber.com/bilim-teknoloji_articles.rss",
    "https://www.ntv.com.tr/teknoloji.rss",
    "https://www.haberturk.com/rss/teknoloji.xml",
    "https://www.sabah.com.tr/rss/teknoloji.xml",
    "https://www.hurriyet.com.tr/rss/teknoloji",
    "https://www.chip.com.tr/rss/",
    "https://www.log.com.tr/feed/",
  ],
  siyaset: [
    "https://www.trthaber.com/siyaset_articles.rss",
    "https://www.ntv.com.tr/siyaset.rss",
    "https://www.haberturk.com/rss/siyaset.xml",
    "https://www.sabah.com.tr/rss/siyaset.xml",
    "https://www.hurriyet.com.tr/rss/siyaset",
    "https://www.milliyet.com.tr/rss/rssNew/siyasetRss.xml",
    "https://www.cnnturk.com/feed/rss/siyaset/news",
    "https://www.sozcu.com.tr/rss/siyaset.xml",
    "https://www.cumhuriyet.com.tr/rss",
    "https://www.ensonhaber.com/rss/ensonhaber.xml",
  ],
  magazin: [
    "https://www.trthaber.com/magazin_articles.rss",
    "https://www.ntv.com.tr/magazin.rss",
    "https://www.haberturk.com/rss/magazin.xml",
    "https://www.sabah.com.tr/rss/magazin.xml",
    "https://www.hurriyet.com.tr/rss/magazin",
    "https://www.milliyet.com.tr/rss/rssNew/magazinRss.xml",
    "https://www.cnnturk.com/feed/rss/magazin/news",
    "https://www.sozcu.com.tr/rss/magazin.xml",
    "https://www.ntv.com.tr/yasam.rss",
    "https://www.haberturk.com/rss/kimdir.xml",
  ],
  dunya: [
    "https://www.ntv.com.tr/dunya.rss",
    "https://www.haberturk.com/rss/dunya.xml",
    "https://www.hurriyet.com.tr/rss/dunya",
    "https://www.milliyet.com.tr/rss/rssNew/dunyaRss.xml",
    "https://www.sabah.com.tr/rss/dunya.xml",
    "https://www.trthaber.com/dunya_articles.rss",
    "https://www.cnnturk.com/feed/rss/dunya/news",
    "https://www.cumhuriyet.com.tr/rss/kategori/98",
    "https://www.sozcu.com.tr/rss/dunya.xml",
  ],
  "kultur-sanat": [
    "https://www.ntv.com.tr/sanat.rss",
    "https://www.haberturk.com/rss/kultur-sanat.xml",
    "https://www.hurriyet.com.tr/rss/kultur-sanat",
    "https://www.milliyet.com.tr/rss/rssNew/sanatRss.xml",
    "https://www.sabah.com.tr/rss/kultur-sanat.xml",
    "https://www.trthaber.com/kultur-sanat_articles.rss",
    "https://www.cnnturk.com/feed/rss/kultur-sanat/news",
    "https://www.cumhuriyet.com.tr/rss/kategori/99",
    "https://www.sozcu.com.tr/rss/kultur-sanat.xml",
    "https://bantmag.com/feed/",
  ],
  "saglik-yasam": [
    "https://www.ntv.com.tr/saglik.rss",
    "https://www.ntv.com.tr/yasam.rss",
    "https://www.haberturk.com/rss/saglik.xml",
    "https://www.hurriyet.com.tr/rss/saglik",
    "https://www.milliyet.com.tr/rss/rssNew/saglikRss.xml",
    "https://www.sabah.com.tr/rss/saglik.xml",
    "https://www.trthaber.com/saglik_articles.rss",
    "https://www.cnnturk.com/feed/rss/saglik/news",
    "https://www.cumhuriyet.com.tr/rss/kategori/100",
    "https://www.sozcu.com.tr/rss/saglik.xml",
  ],
  otomobil: [
    "https://www.ntv.com.tr/otomobil.rss",
    "https://www.haberturk.com/rss/otomobil.xml",
    "https://www.hurriyet.com.tr/rss/otomobil",
    "https://www.milliyet.com.tr/rss/rssNew/otomobilRss.xml",
    "https://www.sabah.com.tr/rss/otomobil.xml",
    "https://www.cnnturk.com/feed/rss/otomobil/news",
    "https://www.sozcu.com.tr/rss/otomotiv.xml",
    "https://shiftdelete.net/otomobil/feed",
    "https://www.webtekno.com/otomobil/rss.xml",
    "https://tr.motor1.com/rss/news/all/",
  ],
};

import {
  pickWeightedNewsCategory,
  type NewsFocusTier,
} from "@/lib/bot/turkey-news-focus";

export { pickWeightedNewsCategory, type NewsFocusTier };

/** @deprecated Ağırlıklı seçim için pickWeightedNewsCategory kullanın */
export function pickRandomCategory(): RssCategoryKey {
  return pickWeightedNewsCategory().category;
}

export function pickRandomFeedUrl(category: RssCategoryKey): string {
  const pool = RSS_FEED_POOL[category];
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
