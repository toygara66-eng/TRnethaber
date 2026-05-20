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
          is_breaking: boolean;
          published_at: string | null;
          source_url: string | null;
          seo_keywords: string | null;
          meta_description: string | null;
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
          is_breaking?: boolean;
          published_at?: string | null;
          source_url?: string | null;
          seo_keywords?: string | null;
          meta_description?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      entity_type: "kisi" | "takim" | "kurum";
    };
  };
};
