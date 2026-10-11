/*
# Create posts table for Inkspace

1. New Tables
- `posts`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users ON DELETE CASCADE)
  - `title` (text, not null)
  - `content` (text, nullable, stores rich-text/HTML content)
  - `status` (text, not null, default 'draft', CHECK constraint limits to 'draft' or 'published')
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now(), updated via trigger on row change)
  - `published_at` (timestamptz, nullable, set when a post transitions to published)
2. Indexes
- `idx_posts_user_id` on `user_id` for fast per-user queries
- `idx_posts_status` on `status` for filtering drafts/published
3. Trigger
- `update_posts_updated_at` automatically sets `updated_at = now()` on UPDATE
4. Security
- Enable RLS on `posts`.
- Owner-scoped CRUD: each authenticated user can only SELECT, INSERT, UPDATE, DELETE their own posts.
- No anon access — this is a strictly private multi-user app requiring authentication.
5. Important Notes
- `user_id` defaults to `auth.uid()` so frontend inserts omitting user_id still satisfy RLS WITH CHECK.
- Published posts remain private to their owner (no public read policy).
*/

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- Auto-update updated_at on row change
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Set published_at when transitioning to published and not already set
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status <> 'published') THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_posts_updated_at();

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_posts" ON posts;
CREATE POLICY "select_own_posts" ON posts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_posts" ON posts;
CREATE POLICY "insert_own_posts" ON posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_posts" ON posts;
CREATE POLICY "update_own_posts" ON posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_posts" ON posts;
CREATE POLICY "delete_own_posts" ON posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);