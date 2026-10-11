# Inkspace — Private Blogging Application

## Overview
Inkspace is a minimal, modern private blogging application where every user can create, edit, and manage their own blog posts. It is strictly private — no public posts, no shared content. Each user only sees their own posts and drafts.

## Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL, Authentication, Storage)
- **Routing:** React Router
- **Icons:** Lucide React

## Database Schema

### `posts` table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Auto-generated unique identifier |
| `user_id` | uuid (FK → auth.users) | Owner of the post, defaults to `auth.uid()` |
| `title` | text | Post title (required) |
| `content` | text | Rich-text/HTML content (nullable) |
| `status` | text | `draft` or `published` (CHECK constraint, default `draft`) |
| `created_at` | timestamptz | Creation timestamp (default `now()`) |
| `updated_at` | timestamptz | Last update timestamp (auto-updated via trigger) |
| `published_at` | timestamptz | Set when post transitions to published (nullable) |

### Indexes
- `idx_posts_user_id` — fast per-user queries
- `idx_posts_status` — fast draft/published filtering

### Trigger
- `update_posts_updated_at` — automatically updates `updated_at` on row change and sets `published_at` when a post first transitions to published status.

## Privacy & Security
- **Row Level Security (RLS)** is enabled on the `posts` table.
- All policies are scoped to `TO authenticated` — anon access is not allowed.
- **SELECT, INSERT, UPDATE, DELETE** each have separate owner-scoped policies using `auth.uid() = user_id`.
- `user_id` defaults to `auth.uid()` so frontend inserts work without explicitly passing the owner.
- Published posts remain private — there is no public read policy.
- Authorization is enforced at the database level, not just the frontend.

## Features
- Email and password registration/login via Supabase Auth
- Dashboard showing the logged-in user's posts with counts (total, published, drafts)
- Create new posts with title and content
- Save drafts or publish posts
- Edit existing posts (change title, content, status)
- View individual posts
- Delete posts with confirmation dialog
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
The `posts` table migration and RLS policies are applied automatically via the Supabase MCP migration tool. No manual SQL setup is needed.

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
- Dashboard with post list, search by title, and post counts
- Post editor with save-as-draft and publish actions
- Post view page with formatted content display
- Delete confirmation dialogs
- Row Level Security enforcing per-user data isolation at the database level
- Protected routes redirecting unauthenticated users to login
- Responsive UI with clean, modern design

### Not Implemented (Intentionally out of MVP scope)
- Comments, likes, and tags
- Image uploads
- Rich-text WYSIWYG editor (content supports plain text and basic HTML)
- Public post sharing

### Configuration Notes
- Supabase URL and anon key are pre-populated in the Bolt environment
- Email confirmation is disabled by default in Supabase Auth
- No additional configuration is required to run the application
