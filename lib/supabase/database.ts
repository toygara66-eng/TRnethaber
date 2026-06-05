export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          title: string;
          slug: string;
          content: string;
          spot_metni: string | null;
          kapak_gorseli: string | null;
          category_id: string;
          yazar: string;
          okuma_sayisi: string;
          view_count: number;
          is_breaking: boolean;
          importance_score: number | null;
          is_headline: boolean;
          is_top_headline: boolean;
          is_manset: boolean;
          is_ust_manset: boolean;
          is_published: boolean;
          published_at: string | null;
          source_url: string | null;
          seo_keywords: string | null;
          meta_description: string | null;
          city: string | null;
          city_slug: string | null;
          social_shared: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          content?: string;
          spot_metni?: string | null;
          kapak_gorseli?: string | null;
          category_id: string;
          yazar?: string;
          okuma_sayisi?: string;
          view_count?: number;
          is_breaking?: boolean;
          importance_score?: number | null;
          is_headline?: boolean;
          is_top_headline?: boolean;
          is_manset?: boolean;
          is_ust_manset?: boolean;
          is_published?: boolean;
          published_at?: string | null;
          source_url?: string | null;
          seo_keywords?: string | null;
          meta_description?: string | null;
          city?: string | null;
          city_slug?: string | null;
          social_shared?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["articles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      entities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          entity_type: "kisi" | "takim" | "kurum";
          bio_content: string;
          image_url: string | null;
          anlik_durum_neden_gundemde: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          entity_type: "kisi" | "takim" | "kurum";
          bio_content?: string;
          image_url?: string | null;
          anlik_durum_neden_gundemde?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["entities"]["Insert"]>;
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["site_settings"]["Insert"]>;
        Relationships: [];
      };
      broken_links: {
        Row: {
          id: string;
          url: string;
          hit_count: number;
          last_detected_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          hit_count?: number;
          last_detected_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["broken_links"]["Insert"]>;
        Relationships: [];
      };
      redirects: {
        Row: {
          id: string;
          from_url: string;
          to_url: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          from_url: string;
          to_url: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["redirects"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          city: string | null;
          favorite_team: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          city?: string | null;
          favorite_team?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
          body: string;
          status: string;
          author_display_name: string | null;
          author_city: string | null;
          author_team: string | null;
          author_avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id: string;
          body: string;
          status?: string;
          author_display_name?: string | null;
          author_city?: string | null;
          author_team?: string | null;
          author_avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      rss_sources: {
        Row: {
          id: string;
          name: string;
          url: string;
          city: string | null;
          category: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          city?: string | null;
          category?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rss_sources"]["Insert"]>;
        Relationships: [];
      };
      media_library: {
        Row: {
          id: string;
          url: string;
          storage_path: string | null;
          tags: string[];
          alt_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          storage_path?: string | null;
          tags?: string[];
          alt_text?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["media_library"]["Insert"]>;
        Relationships: [];
      };
      news_bot_queue: {
        Row: {
          id: string;
          status: string;
          source: string;
          wire_payload: Json;
          rss_meta: Json | null;
          result_payload: Json | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          status?: string;
          source?: string;
          wire_payload: Json;
          rss_meta?: Json | null;
          result_payload?: Json | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["news_bot_queue"]["Insert"]>;
        Relationships: [];
      };
      yazilmis_kisiler: {
        Row: {
          id: string;
          person_name: string;
          normalized_key: string;
          trend_keyword: string | null;
          article_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          person_name: string;
          normalized_key: string;
          trend_keyword?: string | null;
          article_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["yazilmis_kisiler"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "yazilmis_kisiler_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_media_library: {
        Args: { search_query: string };
        Returns: Database["public"]["Tables"]["media_library"]["Row"][];
      };
    };
    Enums: {
      entity_type: "kisi" | "takim" | "kurum";
    };
  };
};
