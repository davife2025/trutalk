-- ============================================================================
-- Session 1 core schema.
-- All tables have Row Level Security enabled — users can only read/write their
-- own rows. apps/api uses the service-role key and bypasses RLS deliberately,
-- since it needs to write assistant messages and log escalations on the
-- user's behalf.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'en' check (locale in ('en', 'pcm', 'yo', 'ha', 'ig')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- mood_checkins
-- ---------------------------------------------------------------------------
create table if not exists public.mood_checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood_score smallint not null check (mood_score between 1 and 5),
  note text,
  created_at timestamptz not null default now()
);

alter table public.mood_checkins enable row level security;

create policy "mood_checkins_select_own" on public.mood_checkins
  for select using (auth.uid() = user_id);
create policy "mood_checkins_insert_own" on public.mood_checkins
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- chat_sessions / chat_messages
-- ---------------------------------------------------------------------------
create table if not exists public.chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.chat_sessions enable row level security;

create policy "chat_sessions_select_own" on public.chat_sessions
  for select using (auth.uid() = user_id);
create policy "chat_sessions_insert_own" on public.chat_sessions
  for insert with check (auth.uid() = user_id);

create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  risk_flag text not null default 'none' check (risk_flag in ('none', 'watch', 'high')),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "chat_messages_select_own" on public.chat_messages
  for select using (auth.uid() = user_id);
-- Inserts happen server-side via the service-role key (apps/api), not directly
-- from the browser, so no insert policy is granted to authenticated users here.

-- ---------------------------------------------------------------------------
-- crisis_escalation_events
-- Deliberately minimal — no raw message content stored here by default.
-- Access restricted entirely to the service role (no end-user policies).
-- ---------------------------------------------------------------------------
create table if not exists public.crisis_escalation_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.chat_sessions (id) on delete set null,
  risk_level text not null check (risk_level in ('watch', 'high')),
  resource_shown text not null,
  triggered_at timestamptz not null default now()
);

alter table public.crisis_escalation_events enable row level security;
-- No select/insert policies for `authenticated` — service role only.

-- ---------------------------------------------------------------------------
-- journal_entries
-- ---------------------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt text,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.journal_entries enable row level security;

create policy "journal_entries_select_own" on public.journal_entries
  for select using (auth.uid() = user_id);
create policy "journal_entries_insert_own" on public.journal_entries
  for insert with check (auth.uid() = user_id);
create policy "journal_entries_delete_own" on public.journal_entries
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- content_library (breathing exercises, mindfulness sessions, sounds, etc.)
-- Publicly readable, admin-managed — no user-scoped RLS needed beyond read-all.
-- ---------------------------------------------------------------------------
create table if not exists public.content_library (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('breathing', 'mindfulness', 'journaling_prompt', 'sound', 'article')),
  title text not null,
  description text,
  duration_seconds integer,
  media_url text,
  evidence_tag text not null default 'moderate' check (evidence_tag in ('strong', 'moderate', 'engagement_only')),
  created_at timestamptz not null default now()
);

alter table public.content_library enable row level security;

create policy "content_library_select_all" on public.content_library
  for select using (true);
