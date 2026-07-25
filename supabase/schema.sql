-- ============================================================
-- AIRSOFT LOG — database schema
-- Paste this whole file into the Supabase SQL Editor and run it.
-- Safe to re-run: everything is drop-if-exists / create-if-not-exists.
-- ============================================================

create extension if not exists citext;
create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES
-- One row per user. Created automatically by a trigger when
-- someone signs up. Never insert into this by hand.
-- ============================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      citext not null unique
                check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name  text check (char_length(display_name) <= 40),
  bio           text check (char_length(bio) <= 300),
  avatar_url    text,
  role          text not null default 'user' check (role in ('user','admin')),
  is_banned     boolean not null default false,
  ban_reason    text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- GAMES — the v1 core. One row per game played.
-- ============================================================

create table if not exists public.games (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  played_on       date not null default current_date
                  check (played_on >= '2000-01-01' and played_on <= current_date + 1),
  field_name      text check (char_length(field_name) <= 80),
  game_type       text check (game_type in ('skirmish','milsim','cqb','speedsoft','scenario','other')),
  kills           int not null default 0 check (kills between 0 and 999),
  deaths          int not null default 0 check (deaths between 0 and 999),
  objectives      int not null default 0 check (objectives between 0 and 999),
  minutes_played  int check (minutes_played between 0 and 1440),
  notes           text check (char_length(notes) <= 2000),
  created_at      timestamptz not null default now()
);

create index if not exists games_user_played_idx on public.games (user_id, played_on desc);

-- ============================================================
-- FRIENDS (v2) — one row per pair, ordered so a pair can't duplicate
-- ============================================================

create table if not exists public.friendships (
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at    timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

-- ============================================================
-- TEAMS (v2)
-- ============================================================

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 2 and 40),
  tag         text unique check (tag ~ '^[A-Z0-9]{2,6}$'),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  team_role  text not null default 'member' check (team_role in ('owner','officer','member')),
  joined_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- ============================================================
-- CLIPS (v2) — links only. Never host video yourself.
-- ============================================================

create table if not exists public.clips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  game_id     uuid references public.games(id) on delete set null,
  title       text not null check (char_length(title) between 1 and 100),
  url         text not null check (url ~* '^https://(www\.)?(youtube\.com|youtu\.be|streamable\.com|medal\.tv)/'),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- GUNS (v3) — the loadout locker
-- ============================================================

create table if not exists public.guns (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  brand          text check (char_length(brand) <= 40),
  platform       text check (char_length(platform) <= 40),
  fps            int check (fps between 0 and 700),
  source_url     text,
  image_url      text,
  parts          jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- REPORTS — moderation queue
-- ============================================================

create table if not exists public.reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid not null references public.profiles(id) on delete cascade,
  reported_id    uuid not null references public.profiles(id) on delete cascade,
  reason         text not null check (reason in ('harassment','cheating','spam','inappropriate','other')),
  details        text check (char_length(details) <= 1000),
  status         text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at     timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

-- ============================================================
-- HELPER FUNCTIONS
-- SECURITY DEFINER + empty search_path so RLS policies can call
-- them without recursing into the policies they're used by.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_banned = false
  );
$$;

-- Auto-create a profile whenever a new auth user appears.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      'player_' || substr(replace(new.id::text, '-', ''), 1, 10)
    ),
    new.raw_user_meta_data ->> 'username'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- LEADERBOARD VIEW
-- security_invoker = on  -> the view respects the caller's RLS
-- instead of the view owner's. Without this, a view is a hole
-- straight through your row-level security.
-- ============================================================

drop view if exists public.player_stats;
create view public.player_stats
with (security_invoker = on) as
select
  p.id                                          as user_id,
  p.username,
  p.display_name,
  count(g.id)                                   as games_logged,
  coalesce(sum(g.kills), 0)                     as total_kills,
  coalesce(sum(g.deaths), 0)                    as total_deaths,
  coalesce(sum(g.objectives), 0)                as total_objectives,
  round(
    coalesce(sum(g.kills), 0)::numeric
    / greatest(coalesce(sum(g.deaths), 0), 1)::numeric
  , 2)                                          as kd_ratio
from public.profiles p
left join public.games g on g.user_id = p.id
where p.is_banned = false
group by p.id, p.username, p.display_name;

-- ============================================================
-- ROW LEVEL SECURITY
-- Every table gets RLS ON. Default deny, then explicit allows.
-- ============================================================

alter table public.profiles     enable row level security;
alter table public.games        enable row level security;
alter table public.friendships  enable row level security;
alter table public.teams        enable row level security;
alter table public.team_members enable row level security;
alter table public.clips        enable row level security;
alter table public.guns         enable row level security;
alter table public.reports      enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select
  using (is_banned = false or id = (select auth.uid()) or public.is_admin());

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  using (id = (select auth.uid()) and is_banned = false)
  with check (id = (select auth.uid()));

drop policy if exists "admins update any profile" on public.profiles;
create policy "admins update any profile"
  on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- ---------- games ----------
drop policy if exists "games are publicly readable" on public.games;
create policy "games are publicly readable"
  on public.games for select using (true);

drop policy if exists "users insert own games" on public.games;
create policy "users insert own games"
  on public.games for insert
  with check (user_id = (select auth.uid()) and public.is_active());

drop policy if exists "users update own games" on public.games;
create policy "users update own games"
  on public.games for update
  using (user_id = (select auth.uid()) and public.is_active())
  with check (user_id = (select auth.uid()));

drop policy if exists "users delete own games" on public.games;
create policy "users delete own games"
  on public.games for delete
  using (user_id = (select auth.uid()) or public.is_admin());

-- ---------- friendships ----------
drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships"
  on public.friendships for select
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()) or public.is_admin());

drop policy if exists "send own friend requests" on public.friendships;
create policy "send own friend requests"
  on public.friendships for insert
  with check (requester_id = (select auth.uid()) and public.is_active());

drop policy if exists "respond to friend requests" on public.friendships;
create policy "respond to friend requests"
  on public.friendships for update
  using (addressee_id = (select auth.uid()) or requester_id = (select auth.uid()));

drop policy if exists "remove own friendships" on public.friendships;
create policy "remove own friendships"
  on public.friendships for delete
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()) or public.is_admin());

-- ---------- teams ----------
drop policy if exists "teams are publicly readable" on public.teams;
create policy "teams are publicly readable" on public.teams for select using (true);

drop policy if exists "create own team" on public.teams;
create policy "create own team" on public.teams for insert
  with check (owner_id = (select auth.uid()) and public.is_active());

drop policy if exists "owner manages team" on public.teams;
create policy "owner manages team" on public.teams for update
  using (owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "owner deletes team" on public.teams;
create policy "owner deletes team" on public.teams for delete
  using (owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "team rosters are readable" on public.team_members;
create policy "team rosters are readable" on public.team_members for select using (true);

drop policy if exists "join or leave a team" on public.team_members;
create policy "join or leave a team" on public.team_members for insert
  with check (user_id = (select auth.uid()) and public.is_active());

drop policy if exists "leave a team" on public.team_members;
create policy "leave a team" on public.team_members for delete
  using (
    user_id = (select auth.uid())
    or public.is_admin()
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = (select auth.uid()))
  );

-- ---------- clips ----------
drop policy if exists "clips are publicly readable" on public.clips;
create policy "clips are publicly readable" on public.clips for select using (true);

drop policy if exists "users manage own clips" on public.clips;
create policy "users manage own clips" on public.clips for insert
  with check (user_id = (select auth.uid()) and public.is_active());

drop policy if exists "users delete own clips" on public.clips;
create policy "users delete own clips" on public.clips for delete
  using (user_id = (select auth.uid()) or public.is_admin());

-- ---------- guns ----------
drop policy if exists "guns are publicly readable" on public.guns;
create policy "guns are publicly readable" on public.guns for select using (true);

drop policy if exists "users insert own guns" on public.guns;
create policy "users insert own guns" on public.guns for insert
  with check (user_id = (select auth.uid()) and public.is_active());

drop policy if exists "users update own guns" on public.guns;
create policy "users update own guns" on public.guns for update
  using (user_id = (select auth.uid()) and public.is_active())
  with check (user_id = (select auth.uid()));

drop policy if exists "users delete own guns" on public.guns;
create policy "users delete own guns" on public.guns for delete
  using (user_id = (select auth.uid()) or public.is_admin());

-- ---------- reports ----------
drop policy if exists "reporter and admins read reports" on public.reports;
create policy "reporter and admins read reports"
  on public.reports for select
  using (reporter_id = (select auth.uid()) or public.is_admin());

drop policy if exists "anyone active can file a report" on public.reports;
create policy "anyone active can file a report"
  on public.reports for insert
  with check (reporter_id = (select auth.uid()) and public.is_active());

drop policy if exists "admins resolve reports" on public.reports;
create policy "admins resolve reports"
  on public.reports for update
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- COLUMN-LEVEL LOCKDOWN
--
-- This is the part people forget. RLS says WHICH ROWS you can
-- update -- it does NOT say which COLUMNS. Without this block a
-- normal user could run:  update profiles set role='admin'
-- on their own row, and RLS would happily allow it, because it
-- IS their row. So: revoke update on everything, then grant it
-- back only on the harmless columns.
-- ============================================================

revoke update on public.profiles from anon, authenticated;
grant  update (username, display_name, bio, avatar_url)
       on public.profiles to authenticated;

-- Admins change roles/bans through the service-role key on the
-- server only (see src/lib/supabase/admin.ts), never from the browser.

-- ============================================================
-- MAKE YOURSELF AN ADMIN
-- Sign up through the website FIRST, then run this line with
-- your own username. Do not skip the signup step.
-- ============================================================
-- update public.profiles set role = 'admin' where username = 'YOUR_USERNAME';
