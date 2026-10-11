import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { supabase, type Post } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      toast({ title: 'Failed to load posts', description: error.message, variant: 'destructive' });
    } else {
      setPosts(data as Post[]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: 'Post deleted' });
  };

  const filteredPosts = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter((p) => p.title.toLowerCase().includes(q));
  }, [posts, search]);

  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your Posts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {posts.length} total · {publishedCount} published · {draftCount} drafts
            </p>
          </div>
          <Button asChild>
            <Link to="/editor/new">
              <Plus className="h-4 w-4 mr-1" />
              New Post
            </Link>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading posts...</div>
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              {search.trim() ? (
                <p className="text-muted-foreground">No posts match your search.</p>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">You haven&apos;t written any posts yet.</p>
                  <Button asChild>
                    <Link to="/editor/new">
                      <Plus className="h-4 w-4 mr-1" />
                      Write your first post
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="hover:border-foreground/20 transition-colors">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                          {post.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.updated_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <Link to={`/posts/${post.id}`} className="block">
                        <h3 className="font-semibold text-foreground hover:underline truncate">
                          {post.title}
                        </h3>
                      </Link>
                      {post.content && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {post.content.replace(/<[^>]*>/g, '').slice(0, 150)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" asChild title="View">
                        <Link to={`/posts/${post.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Edit">
                        <Link to={`/editor/${post.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
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
                              onClick={() => handleDelete(post.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {user && (
          <p className="text-xs text-muted-foreground text-center pt-4">
            Signed in as {user.email}
          </p>
        )}
      </div>
    </Layout>
  );
}
