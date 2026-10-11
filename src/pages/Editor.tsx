import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Send, Plus, Trash2 } from 'lucide-react';
import { supabase, type Post, type PostStatus, type Category } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import RichTextEditor from '@/components/RichTextEditor';
import CoverImageUpload from '@/components/CoverImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);
  const [status, setStatus] = useState<PostStatus>('draft');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('none');
  const [tags, setTags] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // Unique identifier for cover image path — use user id + timestamp for new posts,
  // or the existing post id for edits.
  const [coverIdentifier, setCoverIdentifier] = useState(
    isNew ? `new-${Date.now()}` : (id ?? 'unknown')
  );

  useEffect(() => {
    fetchCategories();
    if (isNew) return;
    fetchPost();
  }, [id]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories((data ?? []) as Category[]);
  };

  const addCategory = async () => {
    const name = newCategory.trim(); if (!name) return;
    const { data, error } = await supabase.from('categories').insert({ name }).select().single();
    if (error) toast({ title: 'Could not create category', description: error.message, variant: 'destructive' });
    else { setCategories((prev) => [...prev, data as Category].sort((a,b) => a.name.localeCompare(b.name))); setCategoryId((data as Category).id); setNewCategory(''); }
  };

  const manageCategory = async (category: Category, remove = false) => {
    if (remove) { if (!window.confirm(`Delete category “${category.name}”?`)) return; const { error } = await supabase.from('categories').delete().eq('id', category.id); if (error) toast({ title: 'Could not delete category', description: error.message, variant: 'destructive' }); else { setCategories((prev) => prev.filter((c) => c.id !== category.id)); setCategoryId('none'); } return; }
    const name = window.prompt('Rename category', category.name)?.trim(); if (!name || name === category.name) return;
    const { error } = await supabase.from('categories').update({ name }).eq('id', category.id); if (error) toast({ title: 'Could not rename category', description: error.message, variant: 'destructive' }); else setCategories((prev) => prev.map((c) => c.id === category.id ? { ...c, name } : c));
  };

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      toast({ title: 'Failed to load post', description: error.message, variant: 'destructive' });
      navigate('/dashboard');
      return;
    }

    if (!data) {
      toast({ title: 'Post not found', variant: 'destructive' });
      navigate('/dashboard');
      return;
    }

    const post = data as Post;
    setTitle(post.title);
    setContent(post.content ?? '');
    setCoverImagePath(post.cover_image_path);
    setStatus(post.status);
    setCategoryId(post.category_id ?? 'none');
    setTags((post.tags ?? []).join(', '));
    setCoverIdentifier(post.id);
    setLoading(false);
  };

  const save = async (newStatus?: PostStatus) => {
    const finalStatus = newStatus ?? status;

    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    setStatus(finalStatus);

    if (isNew) {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: title.trim(),
          content,
          cover_image_path: coverImagePath,
          status: finalStatus,
          category_id: categoryId === 'none' ? null : categoryId,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        })
        .select()
        .single();

      if (error) {
        toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }

      const savedPost = data as Post;

      // If a cover image was uploaded with a temporary identifier, rename it to the post id
      if (coverImagePath && user) {
        const newPath = `${user.id}/${savedPost.id}.${coverImagePath.split('.').pop()}`;
        if (newPath !== coverImagePath) {
          const { error: moveError } = await supabase.storage
            .from('post-covers')
            .move(coverImagePath, newPath);

          if (!moveError) {
            await supabase
              .from('posts')
              .update({ cover_image_path: newPath })
              .eq('id', savedPost.id);
          }
        }
      }

      toast({ title: finalStatus === 'published' ? 'Post published' : 'Draft saved' });
      navigate(`/posts/${savedPost.id}`);
    } else {
      const { error } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          content,
          cover_image_path: coverImagePath,
          status: finalStatus,
          category_id: categoryId === 'none' ? null : categoryId,
          tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        })
        .eq('id', id);

      if (error) {
        toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }

      toast({ title: finalStatus === 'published' ? 'Post published' : 'Draft saved' });
      navigate(`/posts/${id}`);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground text-sm">Loading post...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <Badge variant={status === 'published' ? 'default' : 'secondary'}>
            {status}
          </Badge>
        </div>

        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save('published');
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a title..."
              className="text-lg font-semibold"
              autoFocus={isNew}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <div className="flex gap-2">
              <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-9 flex-1 rounded-md border bg-transparent px-3 text-sm">
                <option value="none">No category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              {categoryId !== 'none' && <><Button type="button" variant="outline" size="sm" onClick={() => manageCategory(categories.find((c) => c.id === categoryId)!)}>Rename</Button><Button type="button" variant="outline" size="icon" onClick={() => manageCategory(categories.find((c) => c.id === categoryId)!, true)}><Trash2 className="h-4 w-4" /></Button></>}
            </div>
            <div className="flex gap-2"><Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" /><Button type="button" variant="outline" onClick={addCategory}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="design, ideas, notes" />
          </div>
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <CoverImageUpload
              coverImagePath={coverImagePath}
              onPathChange={setCoverImagePath}
              postIdentifier={coverIdentifier}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <RichTextEditor content={content} onChange={setContent} />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => save('draft')}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Draft
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              <Send className="h-4 w-4 mr-1" />
              Publish
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
