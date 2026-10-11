import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type PostStatus = 'draft' | 'published';

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  cover_image_path: string | null;
  status: PostStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  category_id: string | null;
  tags: string[];
}

export interface Category { id: string; user_id: string; name: string; created_at: string; }

export interface PostInput {
  title: string;
  content: string | null;
  cover_image_path: string | null;
  status: PostStatus;
  category_id?: string | null;
  tags?: string[];
}
