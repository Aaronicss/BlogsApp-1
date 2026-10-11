import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { supabase, type Post, type PostStatus } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    fetchPost();
  }, [id]);

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
    setStatus(post.status);
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
        .insert({ title: title.trim(), content, status: finalStatus })
        .select()
        .single();

      if (error) {
        toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }

      toast({ title: finalStatus === 'published' ? 'Post published' : 'Draft saved' });
      navigate(`/posts/${(data as Post).id}`);
    } else {
      const { error } = await supabase
        .from('posts')
        .update({ title: title.trim(), content, status: finalStatus })
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
            save();
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
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing..."
              className="min-h-[400px] resize-y font-mono text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Supports plain text. You can use basic HTML for formatting (bold, italics, headings, links).
            </p>
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
              onClick={() => save('published')}
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
