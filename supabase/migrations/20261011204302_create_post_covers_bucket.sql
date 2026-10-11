/*
# Create private post-covers storage bucket with RLS policies

1. Storage
- Creates a PRIVATE bucket `post-covers` for cover image uploads.
- Files are stored under `{user_id}/` path prefixes so RLS can enforce ownership.

2. Security (Storage Policies)
- SELECT (read): authenticated users can only read files under their own user_id prefix.
- INSERT (upload): authenticated users can only upload files under their own user_id prefix.
- UPDATE: authenticated users can only update files under their own user_id prefix.
- DELETE: authenticated users can only delete files under their own user_id prefix.
- No public/anon access — the bucket is private and strictly owner-scoped.

3. Important Notes
- The bucket is created with `public = false` so file URLs are not publicly accessible.
- To display images in the app, we use signed URLs generated per-session via the Supabase client.
- Policies use `(storage.foldername(name))[1]` to extract the top-level folder (user_id) and compare to auth.uid().
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-covers', 'post-covers', false)
ON CONFLICT (id) DO NOTHING;

-- SELECT: users can read their own folder
DROP POLICY IF EXISTS "read_own_covers" ON storage.objects;
CREATE POLICY "read_own_covers"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'post-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- INSERT: users can upload to their own folder
DROP POLICY IF EXISTS "insert_own_covers" ON storage.objects;
CREATE POLICY "insert_own_covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- UPDATE: users can update their own files
DROP POLICY IF EXISTS "update_own_covers" ON storage.objects;
CREATE POLICY "update_own_covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'post-covers' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'post-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- DELETE: users can delete their own files
DROP POLICY IF EXISTS "delete_own_covers" ON storage.objects;
CREATE POLICY "delete_own_covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
