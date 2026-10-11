import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { supabase, type Post } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PostView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchCoverUrl = useCallback(async (path: string) => {
    const { data, error } = await supabase.storage
      .from('post-covers')
      .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      setCoverUrl(null);
      return;
    }
    setCoverUrl(data.signedUrl);
  }, []);

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast({ title: 'Post not found', variant: 'destructive' });
      navigate('/dashboard');
      return;
    }

    const fetchedPost = data as Post;
    setPost(fetchedPost);
    if (fetchedPost.cover_image_path) {
      fetchCoverUrl(fetchedPost.cover_image_path);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (post?.cover_image_path) {
      await supabase.storage.from('post-covers').remove([post.cover_image_path]);
    }
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Post deleted' });
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground text-sm">Loading post...</div>
      </Layout>
    );
  }

  if (!post) return null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/editor/${post.id}`}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &quot;{post.title}&quot; will be permanently deleted. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <article className="space-y-6">
          {coverUrl && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={coverUrl}
                alt={post.title}
                className="w-full max-h-96 object-cover"
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                {post.status}
              </Badge>
              {post.published_at && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Published {format(new Date(post.published_at), 'MMM d, yyyy')}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Updated {format(new Date(post.updated_at), 'MMM d, yyyy')}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
          </div>

          {post.content ? (
            <Card>
              <CardContent className="p-6">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No content yet.
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-muted-foreground pt-4 border-t border-border">
            Created {format(new Date(post.created_at), 'MMM d, yyyy h:mm a')}
          </div>
        </article>
      </div>
    </Layout>
  );
}
