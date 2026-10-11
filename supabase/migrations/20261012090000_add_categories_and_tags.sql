-- User-owned categories and optional post tags.
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_user_name_unique UNIQUE (user_id, name)
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE posts ADD CONSTRAINT posts_tags_length CHECK (cardinality(tags) <= 20);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_categories" ON categories;
DROP POLICY IF EXISTS "insert_own_categories" ON categories;
DROP POLICY IF EXISTS "update_own_categories" ON categories;
DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_categories" ON categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_categories" ON categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_categories" ON categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Prevent assigning another user's category to a post, including updates.
CREATE OR REPLACE FUNCTION enforce_post_category_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.id = NEW.category_id AND c.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'category does not belong to post owner';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS posts_category_owner ON posts;
CREATE TRIGGER posts_category_owner BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION enforce_post_category_owner();
