import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Plus, Pencil, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { supabase, type Post, type Category } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface PostWithCover extends Post {
  coverUrl?: string | null;
  category?: Category | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostWithCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const [{ data, error }, { data: categoryData }] = await Promise.all([supabase
      .from('posts')
      .select('*'), supabase.from('categories').select('*').order('name')]);
    setCategories((categoryData ?? []) as Category[]);

    if (error) {
      toast({ title: 'Failed to load posts', description: error.message, variant: 'destructive' });
    } else {
      const categoryMap = new Map((categoryData ?? []).map((c) => [c.id, c as Category]));
      const postsData = (data as Post[]).map((p) => ({ ...p, category: p.category_id ? categoryMap.get(p.category_id) ?? null : null }));

      // Fetch signed URLs for all cover images in a batch
      const pathsWithCovers = postsData.filter((p) => p.cover_image_path);
      if (pathsWithCovers.length > 0) {
        const { data: urlsData, error: urlsError } = await supabase.storage
          .from('post-covers')
          .createSignedUrls(
            pathsWithCovers.map((p) => p.cover_image_path as string),
            3600
          );

        if (!urlsError && urlsData) {
          const urlMap = new Map<string, string>();
          for (const item of urlsData) {
            if (item.path && item.signedUrl) {
              urlMap.set(item.path, item.signedUrl);
            }
          }
          const enriched = postsData.map((p) => ({
            ...p,
            coverUrl: p.cover_image_path ? (urlMap.get(p.cover_image_path) ?? null) : null,
          }));
          setPosts(enriched);
          setLoading(false);
          return;
        }
      }

      setPosts(postsData);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, coverPath: string | null) => {
    if (coverPath) {
      await supabase.storage.from('post-covers').remove([coverPath]);
    }
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: 'Post deleted' });
  };

  const filteredPosts = useMemo(() => {
    const q = search.toLowerCase();
    return posts.filter((p) => (!q || p.title.toLowerCase().includes(q)) && (categoryFilter === 'all' || p.category_id === categoryFilter)).sort((a,b) => sort === 'oldest' ? +new Date(a.created_at) - +new Date(b.created_at) : sort === 'updated' ? +new Date(b.updated_at) - +new Date(a.updated_at) : +new Date(b.created_at) - +new Date(a.created_at));
  }, [posts, search, categoryFilter, sort]);
  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const visiblePosts = filteredPosts.slice((page - 1) * pageSize, page * pageSize);

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

        <div className="grid gap-2 sm:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setPage(1); }}><SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Select value={sort} onValueChange={(value) => { setSort(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="oldest">Oldest</SelectItem><SelectItem value="updated">Recently updated</SelectItem></SelectContent></Select>
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
            {visiblePosts.map((post) => (
              <Card key={post.id} className="hover:border-foreground/20 transition-colors overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-stretch gap-0">
                    {post.coverUrl && (
                      <Link to={`/posts/${post.id}`} className="shrink-0 hidden sm:block">
                        <img
                          src={post.coverUrl}
                          alt={post.title}
                          className="w-24 h-full object-cover"
                        />
                      </Link>
                    )}
                    <div className="flex-1 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                              {post.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(post.updated_at), 'MMM d, yyyy')}
                            </span>
                            {post.category && <Badge variant="outline">{post.category.name}</Badge>}
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
                                  onClick={() => handleDelete(post.id, post.cover_image_path)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {pageCount > 1 && <div className="flex items-center justify-center gap-3"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {pageCount}</span><Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button></div>}

        {user && (
          <p className="text-xs text-muted-foreground text-center pt-4">
            Signed in as {user.email}
          </p>
        )}
      </div>
    </Layout>
  );
}
