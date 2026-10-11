/*
# Add cover image support to posts table

1. Modified Tables
- `posts`
  - Adds `cover_image_path` (text, nullable) — stores the storage path to a cover image in the private `post-covers` bucket.
  - The path is scoped per-user (e.g. `user_id/post_id/filename.jpg`) so storage RLS policies can enforce ownership.

2. Security
- No changes to existing RLS policies — the column is nullable and accessible only through existing owner-scoped policies.
- Storage bucket `post-covers` is created as a PRIVATE bucket with owner-scoped storage policies.

3. Important Notes
- This migration only ADDS a nullable column; no existing data is modified or lost.
- The storage bucket and its policies are created separately via the Supabase Storage API.
*/

ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_image_path text;
