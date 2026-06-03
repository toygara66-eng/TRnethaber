export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parent_id?: string | null;
};

export type EntityRow = {
  id: string;
  name: string;
  slug: string;
  entity_type: "kisi" | "takim" | "kurum";
  bio_content: string;
  image_url: string | null;
  anlik_durum_neden_gundemde: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  content?: string;
  spot_metni: string | null;
  kapak_gorseli: string | null;
  category_id: string;
  yazar?: string;
  okuma_sayisi: string;
  view_count?: number;
  is_breaking: boolean;
  importance_score?: number | null;
  is_headline?: boolean;
  is_top_headline?: boolean;
  is_manset?: boolean;
  is_ust_manset?: boolean;
  is_published?: boolean | null;
  published_at: string | null;
  source_url?: string | null;
  seo_keywords?: string | null;
  meta_description?: string | null;
  city?: string | null;
  city_slug?: string | null;
  created_at?: string;
  updated_at?: string;
  categories?: CategoryRow | CategoryRow[] | null;
};
