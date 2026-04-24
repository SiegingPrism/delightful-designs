
-- ---------------------------------------------------------------
-- 1. Extend profiles with denormalized counters
-- ---------------------------------------------------------------
alter table public.profiles
  add column if not exists level int not null default 0,
  add column if not exists current_streak int not null default 0,
  add column if not exists longest_streak int not null default 0,
  add column if not exists last_active_date date,
  add column if not exists tasks_completed_total int not null default 0;

-- ---------------------------------------------------------------
-- 2. daily_stats — one row per user per day
-- ---------------------------------------------------------------
create table if not exists public.daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null,
  tasks_completed int not null default 0,
  tasks_planned int not null default 0,
  focus_minutes int not null default 0,
  xp_earned int not null default 0,
  productivity_score int not null default 0,
  streak_kept boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists daily_stats_user_date_idx
  on public.daily_stats (user_id, date desc);

alter table public.daily_stats enable row level security;

create policy "own daily_stats select" on public.daily_stats
  for select using (auth.uid() = user_id);
create policy "own daily_stats insert" on public.daily_stats
  for insert with check (auth.uid() = user_id);
create policy "own daily_stats update" on public.daily_stats
  for update using (auth.uid() = user_id);

create trigger daily_stats_updated_at
  before update on public.daily_stats
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------
-- 3. achievements catalog + user_achievements
-- ---------------------------------------------------------------
create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null default '🏆',
  category text not null default 'general',
  threshold int not null default 1,
  sort_order int not null default 0
);

alter table public.achievements enable row level security;

create policy "achievements public read" on public.achievements
  for select to authenticated using (true);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create index if not exists user_achievements_user_idx
  on public.user_achievements (user_id, unlocked_at desc);

alter table public.user_achievements enable row level security;

create policy "own achievements select" on public.user_achievements
  for select using (auth.uid() = user_id);
create policy "own achievements insert" on public.user_achievements
  for insert with check (auth.uid() = user_id);

-- Seed catalog
insert into public.achievements (id, title, description, icon, category, threshold, sort_order) values
  ('first_task',        'First step',         'Complete your first task',                  '🌱', 'tasks',  1,   1),
  ('tasks_10',          'Getting started',    'Complete 10 tasks',                         '✅', 'tasks',  10,  2),
  ('tasks_50',          'Half a hundred',     'Complete 50 tasks',                         '⚡', 'tasks',  50,  3),
  ('tasks_100',         'Centurion',          'Complete 100 tasks',                        '💯', 'tasks',  100, 4),
  ('streak_3',          'Warming up',         'Reach a 3-day streak',                      '🔥', 'streak', 3,   10),
  ('streak_7',          'On a roll',          'Reach a 7-day streak',                      '🚀', 'streak', 7,   11),
  ('streak_30',         'Unbreakable',        'Reach a 30-day streak',                     '🏔️', 'streak', 30,  12),
  ('level_5',           'Rising',             'Reach level 5',                             '⭐', 'level',  5,   20),
  ('level_10',          'Pro',                'Reach level 10',                            '🌟', 'level',  10,  21),
  ('level_25',          'Master',             'Reach level 25',                            '👑', 'level',  25,  22),
  ('focus_60',          'Deep diver',         'Log 60 focus minutes in a day',             '🎯', 'focus',  60,  30),
  ('perfect_day',       'Perfect day',        'Hit a productivity score of 100',           '✨', 'score',  100, 40)
on conflict (id) do update
  set title = excluded.title,
      description = excluded.description,
      icon = excluded.icon,
      category = excluded.category,
      threshold = excluded.threshold,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------
-- 4. Helper functions
-- ---------------------------------------------------------------

-- Level from total XP (sqrt curve, mirrors client gamification.ts)
create or replace function public.level_from_xp(p_xp int)
returns int language sql immutable set search_path = public as $$
  select floor(sqrt(greatest(p_xp, 0)::numeric / 60))::int;
$$;

-- Daily focus target lookup
create or replace function public._user_focus_target(p_user uuid)
returns int language sql stable set search_path = public as $$
  select coalesce((select daily_focus_target_min from public.profiles where user_id = p_user), 50);
$$;

-- Recompute today's daily_stats row from source tables
create or replace function public.recompute_daily_stats(p_user uuid, p_date date)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_completed int;
  v_planned int;
  v_focus int;
  v_xp int;
  v_streak int;
  v_target int;
  v_score int;
  v_task_part numeric;
  v_focus_part numeric;
  v_streak_part numeric;
  v_kept boolean;
begin
  select count(*) into v_completed
    from public.tasks
    where user_id = p_user
      and completed = true
      and (completed_at::date = p_date);

  select count(*) into v_planned
    from public.tasks
    where user_id = p_user
      and (
        coalesce(due_date, created_at::date) = p_date
        or (completed = true and completed_at::date = p_date)
      );

  select coalesce(sum(duration_min), 0) into v_focus
    from public.focus_sessions
    where user_id = p_user
      and completed_at::date = p_date;

  select coalesce(sum(amount), 0) into v_xp
    from public.xp_events
    where user_id = p_user
      and at::date = p_date;

  select coalesce(current_streak, 0) into v_streak
    from public.profiles where user_id = p_user;

  v_target := public._user_focus_target(p_user);

  v_task_part := (v_completed::numeric / greatest(v_planned, 1)::numeric) * 50;
  v_focus_part := least(v_focus::numeric / greatest(v_target, 1)::numeric, 1) * 30;
  v_streak_part := least(v_streak::numeric / 30, 1) * 20;
  v_score := greatest(0, least(100, round(v_task_part + v_focus_part + v_streak_part)::int));
  v_kept := v_score >= 60;

  insert into public.daily_stats (
    user_id, date, tasks_completed, tasks_planned, focus_minutes,
    xp_earned, productivity_score, streak_kept
  ) values (
    p_user, p_date, v_completed, v_planned, v_focus, v_xp, v_score, v_kept
  )
  on conflict (user_id, date) do update
    set tasks_completed   = excluded.tasks_completed,
        tasks_planned     = excluded.tasks_planned,
        focus_minutes     = excluded.focus_minutes,
        xp_earned         = excluded.xp_earned,
        productivity_score = excluded.productivity_score,
        streak_kept       = excluded.streak_kept,
        updated_at        = now();
end;
$$;

-- Update streak based on yesterday's score and today's activity
create or replace function public.refresh_streak(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_today_kept boolean;
  v_yesterday_kept boolean;
  v_last_active date;
  v_current int;
  v_longest int;
begin
  select streak_kept into v_today_kept
    from public.daily_stats where user_id = p_user and date = v_today;
  select streak_kept into v_yesterday_kept
    from public.daily_stats where user_id = p_user and date = v_yesterday;

  select current_streak, longest_streak, last_active_date
    into v_current, v_longest, v_last_active
    from public.profiles where user_id = p_user;

  v_current := coalesce(v_current, 0);
  v_longest := coalesce(v_longest, 0);

  if coalesce(v_today_kept, false) then
    if v_last_active = v_yesterday or v_last_active = v_today then
      -- continuing or already counted
      if v_last_active <> v_today then
        v_current := v_current + 1;
      end if;
    elsif v_last_active is null or v_last_active < v_yesterday then
      v_current := 1;
    end if;
    v_last_active := v_today;
  elsif v_last_active is not null and v_last_active < v_yesterday then
    -- gap detected, reset
    v_current := 0;
  end if;

  if v_current > v_longest then v_longest := v_current; end if;

  update public.profiles
    set current_streak = v_current,
        longest_streak = v_longest,
        last_active_date = v_last_active
    where user_id = p_user;
end;
$$;

-- Award achievements based on current state
create or replace function public.check_achievements(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_total_tasks int;
  v_streak int;
  v_level int;
  v_max_focus int;
  v_max_score int;
begin
  select tasks_completed_total, current_streak, level
    into v_total_tasks, v_streak, v_level
    from public.profiles where user_id = p_user;

  select coalesce(max(focus_minutes), 0) into v_max_focus from public.daily_stats where user_id = p_user;
  select coalesce(max(productivity_score), 0) into v_max_score from public.daily_stats where user_id = p_user;

  -- Tasks
  if v_total_tasks >= 1   then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'first_task') on conflict do nothing; end if;
  if v_total_tasks >= 10  then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'tasks_10')   on conflict do nothing; end if;
  if v_total_tasks >= 50  then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'tasks_50')   on conflict do nothing; end if;
  if v_total_tasks >= 100 then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'tasks_100')  on conflict do nothing; end if;

  -- Streak
  if v_streak >= 3  then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'streak_3')  on conflict do nothing; end if;
  if v_streak >= 7  then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'streak_7')  on conflict do nothing; end if;
  if v_streak >= 30 then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'streak_30') on conflict do nothing; end if;

  -- Level
  if v_level >= 5  then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'level_5')  on conflict do nothing; end if;
  if v_level >= 10 then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'level_10') on conflict do nothing; end if;
  if v_level >= 25 then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'level_25') on conflict do nothing; end if;

  -- Focus / Score
  if v_max_focus >= 60   then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'focus_60')    on conflict do nothing; end if;
  if v_max_score >= 100  then insert into public.user_achievements (user_id, achievement_id) values (p_user, 'perfect_day') on conflict do nothing; end if;
end;
$$;

-- ---------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------

-- Tasks: maintain daily_stats + tasks_completed_total
create or replace function public.tasks_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_dates date[];
begin
  v_user := coalesce(new.user_id, old.user_id);

  -- collect affected dates
  v_dates := array(
    select distinct d from unnest(array[
      coalesce(new.due_date, new.created_at::date, current_date),
      coalesce(old.due_date, old.created_at::date, current_date),
      coalesce(new.completed_at::date, current_date),
      coalesce(old.completed_at::date, current_date),
      current_date
    ]) as d where d is not null
  );

  -- update tasks_completed_total
  if (tg_op = 'UPDATE') then
    if new.completed = true and (old.completed is distinct from true) then
      update public.profiles set tasks_completed_total = tasks_completed_total + 1 where user_id = v_user;
    elsif new.completed = false and (old.completed = true) then
      update public.profiles set tasks_completed_total = greatest(0, tasks_completed_total - 1) where user_id = v_user;
    end if;
  elsif tg_op = 'INSERT' and new.completed = true then
    update public.profiles set tasks_completed_total = tasks_completed_total + 1 where user_id = v_user;
  elsif tg_op = 'DELETE' and old.completed = true then
    update public.profiles set tasks_completed_total = greatest(0, tasks_completed_total - 1) where user_id = v_user;
  end if;

  -- recompute affected days
  perform public.recompute_daily_stats(v_user, d) from unnest(v_dates) as d;
  perform public.refresh_streak(v_user);
  perform public.check_achievements(v_user);
  return coalesce(new, old);
end;
$$;

drop trigger if exists tasks_after_ins on public.tasks;
drop trigger if exists tasks_after_upd on public.tasks;
drop trigger if exists tasks_after_del on public.tasks;

create trigger tasks_after_ins after insert on public.tasks
  for each row execute function public.tasks_after_change();
create trigger tasks_after_upd after update on public.tasks
  for each row execute function public.tasks_after_change();
create trigger tasks_after_del after delete on public.tasks
  for each row execute function public.tasks_after_change();

-- Focus sessions
create or replace function public.focus_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_date date;
begin
  v_user := coalesce(new.user_id, old.user_id);
  v_date := coalesce(new.completed_at, old.completed_at, now())::date;
  perform public.recompute_daily_stats(v_user, v_date);
  perform public.refresh_streak(v_user);
  perform public.check_achievements(v_user);
  return coalesce(new, old);
end;
$$;

drop trigger if exists focus_after_ins on public.focus_sessions;
drop trigger if exists focus_after_del on public.focus_sessions;
create trigger focus_after_ins after insert on public.focus_sessions
  for each row execute function public.focus_after_change();
create trigger focus_after_del after delete on public.focus_sessions
  for each row execute function public.focus_after_change();

-- XP events: keep total_xp + level fresh, recompute today's stats
create or replace function public.xp_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_level int;
begin
  update public.profiles
    set total_xp = total_xp + new.amount
    where user_id = new.user_id
    returning total_xp into v_total;

  v_level := public.level_from_xp(coalesce(v_total, 0));

  update public.profiles
    set level = v_level
    where user_id = new.user_id;

  perform public.recompute_daily_stats(new.user_id, new.at::date);
  perform public.refresh_streak(new.user_id);
  perform public.check_achievements(new.user_id);
  return new;
end;
$$;

drop trigger if exists xp_after_ins on public.xp_events;
create trigger xp_after_ins after insert on public.xp_events
  for each row execute function public.xp_after_insert();

-- Backfill profile counters for existing users
update public.profiles p
   set total_xp = coalesce((select sum(amount) from public.xp_events x where x.user_id = p.user_id), 0),
       tasks_completed_total = coalesce((select count(*) from public.tasks t where t.user_id = p.user_id and t.completed = true), 0);

update public.profiles
   set level = public.level_from_xp(total_xp);
