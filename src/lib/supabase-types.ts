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
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      post_status: 'draft' | 'published';
    };
  };
}
