-- Dandy's Progress v5
-- Запусти весь файл один раз в Supabase: SQL Editor → New query → Run.
-- Файл можно безопасно запустить повторно: таблицы и политики обновятся.

-- 1. Приватное облачное сохранение. Его видит только владелец аккаунта.
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists "Users can read own progress" on public.user_progress;
create policy "Users can read own progress"
on public.user_progress for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own progress" on public.user_progress;
create policy "Users can insert own progress"
on public.user_progress for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own progress" on public.user_progress;
create policy "Users can update own progress"
on public.user_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own progress" on public.user_progress;
create policy "Users can delete own progress"
on public.user_progress for delete
using (auth.uid() = user_id);

-- 2. Публичные страницы игроков.
-- Email и приватные заметки сюда не попадают. public_data содержит только безопасную сводку.
create table if not exists public.public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_toon text not null default 'boxten',
  is_public boolean not null default true,
  public_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_profiles_username_format
    check (username ~ '^[a-z0-9_-]{3,24}$'),
  constraint public_profiles_display_name_length
    check (char_length(display_name) between 1 and 32),
  constraint public_profiles_bio_length
    check (char_length(bio) <= 180)
);

create index if not exists public_profiles_public_updated_idx
  on public.public_profiles (is_public, updated_at desc);

alter table public.public_profiles enable row level security;

-- Любой посетитель, даже без входа, может смотреть только открытые страницы.
-- Владелец может видеть свою страницу и в приватном режиме.
drop policy if exists "Public profiles are readable" on public.public_profiles;
create policy "Public profiles are readable"
on public.public_profiles for select
using (is_public = true or auth.uid() = user_id);

-- Создавать, менять и удалять страницу может только её владелец.
drop policy if exists "Users can insert own public profile" on public.public_profiles;
create policy "Users can insert own public profile"
on public.public_profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own public profile" on public.public_profiles;
create policy "Users can update own public profile"
on public.public_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own public profile" on public.public_profiles;
create policy "Users can delete own public profile"
on public.public_profiles for delete
using (auth.uid() = user_id);
