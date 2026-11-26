-- Restaurant Conversation Game: database for Supabase.
-- Run it once in the Supabase dashboard: SQL Editor → New query → paste this file → Run.
-- Safe to run again after changes: it creates what is missing and replaces functions and policies.
--
-- Who can see what (row-level security):
--   * a learner reads and adds only their own results, and edits only their own name/class/avatar;
--   * a teacher (profiles.role = 'admin') reads everyone's results and edits conversations and questions;
--   * the leaderboard function shares only names, classes and totals, never emails or answers.

-- Profiles ---------------------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default '',
  avatar text,
  classroom text not null default '',
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- Every new Google sign-in gets a profile, named after the Google account to start with.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 15))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only a teacher can change anyone's role. (The SQL editor runs with no signed-in user, so it can
-- make the first teacher.)
create or replace function public.protect_role()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role and (select auth.uid()) is not null and not public.is_admin() then
    raise exception 'only a teacher can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_role on public.profiles;
create trigger protect_role
  before update on public.profiles
  for each row execute function public.protect_role();

-- Results ----------------------------------------------------------------------------------------

-- One played level: stars for the level, points, and every guest's conversation (replies, how they
-- were given, and what the speech recogniser heard).
create table if not exists public.level_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  level_id text not null,
  stars smallint not null check (stars between 0 and 3),
  score integer not null default 0 check (score between 0 and 5000),
  guests jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists level_attempts_user_idx on public.level_attempts (user_id, created_at);

-- One practice round (10 questions).
create table if not exists public.practice_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null,
  correct integer not null check (correct >= 0),
  total integer not null check (total > 0 and correct <= total),
  points integer not null default 0 check (points between 0 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists practice_results_user_idx on public.practice_results (user_id, created_at);

-- The pre-test and post-test: one result each per learner (a teacher deletes it to allow a retake).
create table if not exists public.test_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  form text not null check (form in ('pre', 'post')),
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and score <= total),
  by_skill jsonb not null default '{}',
  answers jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, form)
);

-- Teacher edits ----------------------------------------------------------------------------------

-- Conversations and questions edited or added by a teacher; the game lays them over the built-in
-- ones in data/ (kind 'dialogue': id = dialogue tree id; kind 'question': id = question id).
create table if not exists public.content (
  kind text not null check (kind in ('dialogue', 'question')),
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  primary key (kind, id)
);

-- Row-level security -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.level_attempts enable row level security;
alter table public.practice_results enable row level security;
alter table public.test_results enable row level security;
alter table public.content enable row level security;

drop policy if exists "profiles: read own, teachers read all" on public.profiles;
create policy "profiles: read own, teachers read all" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "profiles: edit own, teachers edit all" on public.profiles;
create policy "profiles: edit own, teachers edit all" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

drop policy if exists "attempts: read own, teachers read all" on public.level_attempts;
create policy "attempts: read own, teachers read all" on public.level_attempts
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "attempts: add own" on public.level_attempts;
create policy "attempts: add own" on public.level_attempts
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "attempts: teachers delete" on public.level_attempts;
create policy "attempts: teachers delete" on public.level_attempts
  for delete to authenticated using (public.is_admin());

drop policy if exists "practice: read own, teachers read all" on public.practice_results;
create policy "practice: read own, teachers read all" on public.practice_results
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "practice: add own" on public.practice_results;
create policy "practice: add own" on public.practice_results
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "practice: teachers delete" on public.practice_results;
create policy "practice: teachers delete" on public.practice_results
  for delete to authenticated using (public.is_admin());

drop policy if exists "tests: read own, teachers read all" on public.test_results;
create policy "tests: read own, teachers read all" on public.test_results
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "tests: add own" on public.test_results;
create policy "tests: add own" on public.test_results
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "tests: teachers delete" on public.test_results;
create policy "tests: teachers delete" on public.test_results
  for delete to authenticated using (public.is_admin());

drop policy if exists "content: everyone reads" on public.content;
create policy "content: everyone reads" on public.content
  for select to anon, authenticated using (true);
drop policy if exists "content: teachers add" on public.content;
create policy "content: teachers add" on public.content
  for insert to authenticated with check (public.is_admin());
drop policy if exists "content: teachers edit" on public.content;
create policy "content: teachers edit" on public.content
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "content: teachers delete" on public.content;
create policy "content: teachers delete" on public.content
  for delete to authenticated using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.level_attempts, public.practice_results, public.test_results to authenticated;
grant select on public.content to anon, authenticated;
grant insert, update, delete on public.content to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Leaderboard ------------------------------------------------------------------------------------

-- Learners ordered by stars (best per level), then points (best score per level + practice points).
create or replace function public.leaderboard(p_classroom text default null)
returns table (user_id uuid, display_name text, avatar text, classroom text, stars integer, points integer, levels_done integer)
language sql stable security definer set search_path = ''
as $$
  -- One row per (user, level): the best attempt as a whole (most stars, then highest score),
  -- so stars and score always come from the same attempt instead of mixing each field's best
  -- across different attempts (which could show a stars/score combo no single attempt earned).
  with best as (
    select distinct on (a.user_id, a.level_id) a.user_id, a.level_id, a.stars, a.score
    from public.level_attempts a
    order by a.user_id, a.level_id, a.stars desc, a.score desc
  ), levels as (
    select b.user_id, sum(b.stars)::int as stars, sum(b.score)::int as score, (count(*) filter (where b.stars > 0))::int as levels_done
    from best b
    group by b.user_id
  ), practice as (
    select p.user_id, sum(p.points)::int as points
    from public.practice_results p
    group by p.user_id
  )
  select pr.id, pr.display_name, pr.avatar, pr.classroom,
         coalesce(l.stars, 0), coalesce(l.score, 0) + coalesce(pt.points, 0), coalesce(l.levels_done, 0)
  from public.profiles pr
  left join levels l on l.user_id = pr.id
  left join practice pt on pt.user_id = pr.id
  where pr.role = 'student' and (p_classroom is null or pr.classroom = p_classroom)
  order by 5 desc, 6 desc, pr.display_name
  limit 200;
$$;

revoke execute on function public.leaderboard(text) from public, anon;
grant execute on function public.leaderboard(text) to authenticated;
