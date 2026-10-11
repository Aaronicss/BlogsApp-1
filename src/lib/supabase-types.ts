export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string | null;
          status: 'draft' | 'published';
          created_at: string;
          updated_at: string;
          published_at: string | null;
          category_id: string | null;
          tags: string[];
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          content?: string | null;
          status?: 'draft' | 'published';
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          category_id?: string | null;
          tags?: string[];
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string | null;
          status?: 'draft' | 'published';
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          category_id?: string | null;
          tags?: string[];
        };
      };
      categories: {
        Row: { id: string; user_id: string; name: string; created_at: string };
        Insert: { id?: string; user_id?: string; name: string; created_at?: string };
        Update: { name?: string };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      post_status: 'draft' | 'published';
    };
  };
}
