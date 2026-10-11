# Inkspace — Private Blogging Application

## Overview
Inkspace is a minimal, modern private blogging application where every user can create, edit, and manage their own blog posts. It is strictly private — no public posts, no shared content. Each user only sees their own posts and drafts.

## Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL, Authentication, Storage)
- **Routing:** React Router
- **Rich-Text Editor:** Tiptap (@tiptap/react, @tiptap/starter-kit, @tiptap/extension-link)
- **Icons:** Lucide React

## Database Schema

### `posts` table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated unique identifier |
| `user_id` | uuid (FK → auth.users) | Owner of the post, defaults to `auth.uid()` |
| `title` | text | Post title (required) |
| `content` | text | Rich-text HTML content from Tiptap editor (nullable) |
| `cover_image_path` | text | Storage path to cover image in `post-covers` bucket (nullable) |
| `status` | text | `draft` or `published` (CHECK constraint, default `draft`) |
| `created_at` | timestamptz | Creation timestamp (default `now()`) |
| `updated_at` | timestamptz | Last update timestamp (auto-updated via trigger) |
| `published_at` | timestamptz | Set when post transitions to published (nullable) |

### Indexes
- `idx_posts_user_id` — fast per-user queries
- `idx_posts_status` — fast draft/published filtering

### Trigger
- `update_posts_updated_at` — automatically updates `updated_at` on row change and sets `published_at` when a post first transitions to published status.

### Storage: `post-covers` bucket
- A **private** Supabase Storage bucket for cover image uploads.
- Files are stored under `{user_id}/` path prefixes.
- **RLS policies** on `storage.objects` enforce that authenticated users can only SELECT, INSERT, UPDATE, and DELETE files in their own `user_id` folder.
- Images are never publicly accessible — the app generates **signed URLs** (1-hour expiry) per session to display cover images.
- No anon access to the bucket.

## Privacy & Security
- **Row Level Security (RLS)** is enabled on the `posts` table.
- All policies are scoped to `TO authenticated` — anon access is not allowed.
- **SELECT, INSERT, UPDATE, DELETE** each have separate owner-scoped policies using `auth.uid() = user_id`.
- `user_id` defaults to `auth.uid()` so frontend inserts work without explicitly passing the owner.
- Published posts remain private — there is no public read policy.
- Cover images in the `post-covers` storage bucket are protected by storage RLS policies scoped to each user's folder. Users can only access their own images.
- Authorization is enforced at the database and storage level, not just the frontend.

## Features
- Email and password registration/login via Supabase Auth
- Dashboard showing the logged-in user's posts with counts (total, published, drafts) and cover image thumbnails
- Create new posts with title and rich-text content
- **Tiptap rich-text editor** with toolbar: headings (H1, H2, H3), bold, italic, bullet lists, numbered lists, blockquotes, links, undo/redo
- **Cover image uploads** to a private Supabase Storage bucket with:
  - Drag-and-drop file picker with preview
  - Upload validation: image type (JPEG, PNG, WebP, GIF) and size (max 5MB)
  - Clear error messages for invalid uploads
  - Image removal with storage cleanup
  - Signed URL generation for private image display
- Save drafts or publish posts
- Edit existing posts (change title, content, cover image, status)
- View individual posts with cover image and formatted rich-text content
- Delete posts (and their cover images) with confirmation dialog
- Search posts by title
- Responsive, clean UI

## Project Structure
```
src/
├── App.tsx                      # Router setup with protected routes
├── main.tsx                     # App entry point
├── context/AuthContext.tsx      # Auth provider (session, signIn, signUp, signOut)
├── components/
│   ├── Layout.tsx               # App header and shell
│   ├── ProtectedRoute.tsx       # Redirects unauthenticated users to /login
│   ├── RichTextEditor.tsx       # Tiptap editor with formatting toolbar
│   ├── CoverImageUpload.tsx     # Cover image upload with validation and preview
│   └── ui/                      # shadcn/ui components
├── pages/
│   ├── Auth.tsx                 # Login and signup screen
│   ├── Dashboard.tsx            # Post list with search, stats, delete
│   ├── Editor.tsx               # Create/edit post with draft/publish
│   └── PostView.tsx             # Read-only view of a single post
├── lib/
│   ├── supabase.ts              # Supabase client + Post types
│   └── supabase-types.ts        # Database type definitions
└── hooks/
    └── use-toast.ts             # Toast notification hook
```

## Setup

### Environment Variables
The app requires Supabase configuration via environment variables. A `.env.example` file is provided with placeholders:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key. In the Bolt environment, these are pre-populated automatically.

### Database
The `posts` table migration, RLS policies, and the `post-covers` storage bucket with its storage policies are applied automatically via the Supabase MCP migration tool. No manual SQL setup is needed.

## How to Run
The dev server runs automatically in the Bolt environment. For local development:

```bash
npm install
npm run dev
```

For production build:

```bash
npm run build
```

## Implementation Status

### Working
- Email/password authentication (signup, login, logout) via Supabase Auth
- Post CRUD: create, read, update, delete — all backed by real Supabase database operations
- Draft and publish status with automatic `published_at` timestamping
- Dashboard with post list, search by title, post counts, and cover image thumbnails
- Post editor with Tiptap rich-text editor (headings, bold, italic, lists, links, blockquotes, undo/redo)
- Cover image upload to private Supabase Storage bucket with validation (type, size), preview, and removal
- Cover images saved to database and restored when editing — saved formatting and images persist across save/reopen cycles
- Post view page with cover image display and formatted rich-text content
- Delete confirmation dialogs (also removes cover image from storage)
- Row Level Security enforcing per-user data isolation at the database level
- Storage RLS policies enforcing per-user image isolation in the `post-covers` bucket
- Protected routes redirecting unauthenticated users to login
- Responsive UI with clean, modern design

### Categories, tags, and dashboard management
- Users can create, rename, and delete their own categories. Categories are private and protected by Supabase RLS.
- Posts have an optional `category_id` and optional comma-separated tags stored as a constrained `text[]`.
- The editor assigns categories and tags while preserving existing rich text and cover-image behavior.
- The dashboard filters by category, sorts by newest, oldest, or recently updated, and paginates results with previous/next controls.
- Category ownership is enforced by RLS and a database trigger that prevents cross-user category assignment.

### Not Implemented (Intentionally out of MVP scope)
- Comments and likes
- Public post sharing
- In-content image embedding (only cover images are supported)

### Configuration Notes
- Supabase URL and anon key are pre-populated in the Bolt environment
- Email confirmation is disabled by default in Supabase Auth
- No additional configuration is required to run the application
