-- TRIO FIT schema. All access goes through the server using the service-role key; the browser never talks to the
-- database. Row Level Security is enabled everywhere with NO policies for anon/authenticated roles = deny by default.

-- ───────────────────────── members ─────────────────────────
create table members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('amr','aman','shady')),
  name text not null,
  display_name text not null,
  avatar_url text,
  workout_days smallint[] not null default '{0,1,2,3,4,5,6}',
  tone text not null default 'hype' check (tone in ('hype','calm','funny')),
  language text not null default 'ar' check (language in ('ar','en')),
  messages_enabled boolean not null default true,
  share_body_stats boolean not null default true,
  theme text not null default 'light' check (theme in ('light','dark')),
  equipped_title text,
  equipped_frame text,
  created_at timestamptz not null default now()
);

create table member_goals (
  member_id uuid primary key references members(id) on delete cascade,
  height_cm numeric(5,1) check (height_cm between 100 and 250),
  start_weight_kg numeric(5,2) check (start_weight_kg between 20 and 400),
  target_weight_kg numeric(5,2) check (target_weight_kg between 20 and 400),
  target_body_fat_pct numeric(4,1) check (target_body_fat_pct between 2 and 70),
  calorie_target int check (calorie_target between 800 and 6000),
  protein_target_g int check (protein_target_g between 20 and 500),
  carbs_target_g int check (carbs_target_g between 0 and 900),
  fat_target_g int check (fat_target_g between 10 and 300),
  water_target_ml int not null default 2500 check (water_target_ml between 500 and 8000),
  updated_at timestamptz not null default now()
);

create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  measured_on date not null,
  measured_at timestamptz not null default now(),
  weight_kg numeric(5,2) check (weight_kg between 20 and 400),
  height_cm numeric(5,1) check (height_cm between 100 and 250),
  body_fat_pct numeric(4,1) check (body_fat_pct between 2 and 70),
  waist_cm numeric(5,1), chest_cm numeric(5,1), arm_cm numeric(5,1), thigh_cm numeric(5,1),
  skeletal_muscle_kg numeric(5,1), body_water_kg numeric(5,1),
  visceral_level numeric(4,1), bmr_kcal int,
  note text,
  source text not null default 'manual' check (source in ('manual','report_ocr')),
  report_details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on body_measurements (member_id, measured_on desc);

create table progress_photos (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  taken_on date not null,
  storage_path text not null,
  visibility text not null default 'private' check (visibility in ('private','shared')),
  note text,
  created_at timestamptz not null default now()
);
create index on progress_photos (member_id, taken_on desc);

-- ───────────────────────── exercises ─────────────────────────
create table exercise_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default 'resistance' check (kind in ('resistance','cardio')),
  equipment text,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  instructions text,
  safety_notes text,
  image_url text,
  youtube_url text,
  youtube_video_id text,
  youtube_title text,
  youtube_verified_at timestamptz,
  youtube_query text,
  is_custom boolean not null default false,
  created_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table exercise_category_links (
  exercise_id uuid not null references exercises(id) on delete cascade,
  category_id uuid not null references exercise_categories(id) on delete cascade,
  primary key (exercise_id, category_id)
);

-- ───────────────────────── workouts ─────────────────────────
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  performed_on date not null,
  title text not null,
  duration_min int check (duration_min between 1 and 600),
  perceived_effort smallint check (perceived_effort between 1 and 10),
  notes text,
  status text not null default 'completed' check (status in ('draft','completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on workout_sessions (member_id, performed_on desc);

create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  position int not null default 0,
  notes text,
  duration_min numeric(6,1) check (duration_min >= 0),
  distance_km numeric(6,2) check (distance_km >= 0),
  avg_speed_kmh numeric(5,1) check (avg_speed_kmh >= 0),
  incline_pct numeric(4,1) check (incline_pct >= 0)
);
create index on workout_exercises (session_id);
create index on workout_exercises (exercise_id);

create table exercise_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_no int not null,
  weight_kg numeric(6,2) check (weight_kg >= 0),
  reps int check (reps >= 0),
  rest_sec int check (rest_sec >= 0),
  unique (workout_exercise_id, set_no)
);

-- ───────────────────────── nutrition ─────────────────────────
create table food_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  eaten_on date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  name text not null,
  quantity numeric(9,2) not null check (quantity > 0),
  unit text not null default 'g',
  grams numeric(9,2),
  calories numeric(8,1) not null default 0 check (calories >= 0),
  protein_g numeric(7,1) not null default 0,
  carbs_g numeric(7,1) not null default 0,
  fat_g numeric(7,1) not null default 0,
  fiber_g numeric(7,1) not null default 0,
  source text not null default 'manual' check (source in ('manual','openfoodfacts','ai_estimate','saved')),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index on food_logs (member_id, eaten_on desc);

create table food_items (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  name text not null,
  unit text not null default 'g',
  default_quantity numeric(9,2) not null default 100,
  calories numeric(8,1) not null default 0,
  protein_g numeric(7,1) not null default 0,
  carbs_g numeric(7,1) not null default 0,
  fat_g numeric(7,1) not null default 0,
  fiber_g numeric(7,1) not null default 0,
  source text not null default 'manual',
  use_count int not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (member_id, name)
);

create table saved_meals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  name text not null,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')),
  items jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (member_id, name)
);

create table water_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  day date not null,
  ml int not null check (ml between 50 and 5000),
  created_at timestamptz not null default now()
);
create index on water_logs (member_id, day);

create table daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  day date not null,
  energy smallint check (energy between 1 and 5),
  sleep_hours numeric(3,1) check (sleep_hours between 0 and 16),
  stress smallint check (stress between 1 and 5),
  note text,
  food_log_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, day)
);

-- ───────────────────────── game engine ─────────────────────────
-- XP/coins are an append-only ledger. event_key is UNIQUE: re-sending or re-saving an event can never pay twice.
create table xp_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  event_key text not null unique,
  amount int not null default 0 check (amount >= 0),
  coins int not null default 0,
  reason text not null,
  ref_type text,
  ref_id uuid,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index on xp_transactions (member_id, occurred_on desc);

create table achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  icon text not null default 'trophy',
  rule jsonb not null,
  xp_reward int not null default 0,
  coin_reward int not null default 0
);

create table member_achievements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (member_id, achievement_id)
);

create table cosmetic_items (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  kind text not null check (kind in ('title','frame')),
  name text not null,
  value text not null,
  cost_coins int not null default 0 check (cost_coins >= 0)
);
create table member_cosmetics (
  member_id uuid not null references members(id) on delete cascade,
  item_id uuid not null references cosmetic_items(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (member_id, item_id)
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('individual','team','battle')),
  title text not null,
  description text,
  metric text not null check (metric in ('workout_sessions','food_log_days','water_days','measurements','personal_records','checkins')),
  target int not null check (target > 0),
  starts_on date not null,
  ends_on date not null,
  xp_reward int not null default 0 check (xp_reward between 0 and 500),
  is_boss boolean not null default false,
  created_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create table challenge_participants (
  challenge_id uuid not null references challenges(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (challenge_id, member_id)
);
-- progress contributions; rebuilt from source records, de-duplicated by event_key
create table challenge_events (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  day date not null,
  amount int not null default 1,
  event_key text not null unique
);
create index on challenge_events (challenge_id, member_id);

create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  kind text not null,
  body text not null,
  facts jsonb,
  source text not null default 'rules' check (source in ('ai','rules')),
  event_key text unique,
  created_at timestamptz not null default now()
);
create index on ai_insights (member_id, created_at desc);

create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table login_attempts (
  id bigserial primary key,
  ip_hash text not null,
  succeeded boolean not null,
  created_at timestamptz not null default now()
);
create index on login_attempts (ip_hash, created_at desc);

-- ───────────────────────── derived totals ─────────────────────────
create view member_totals as
  select m.id as member_id,
         coalesce(sum(t.amount), 0)::int as xp_total,
         coalesce(sum(t.coins), 0)::int as coins_total
  from members m left join xp_transactions t on t.member_id = m.id
  group by m.id;

-- ───────────────────────── server-authoritative functions ─────────────────────────
-- Idempotent reward: returns true only the first time an event_key is seen.
create function award_xp(p_member uuid, p_event_key text, p_amount int, p_coins int, p_reason text,
                         p_ref_type text default null, p_ref_id uuid default null, p_day date default current_date)
returns boolean language plpgsql as $$
declare inserted int;
begin
  insert into xp_transactions (member_id, event_key, amount, coins, reason, ref_type, ref_id, occurred_on)
  values (p_member, p_event_key, greatest(p_amount, 0), p_coins, p_reason, p_ref_type, p_ref_id, p_day)
  on conflict (event_key) do nothing;
  get diagnostics inserted = row_count;
  return inserted = 1;
end $$;

create function grant_achievement(p_member uuid, p_key text) returns boolean language plpgsql as $$
declare a achievements%rowtype; inserted int;
begin
  select * into a from achievements where key = p_key;
  if not found then return false; end if;
  insert into member_achievements (member_id, achievement_id) values (p_member, a.id) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then
    perform award_xp(p_member, 'achievement:' || p_member || ':' || a.key, a.xp_reward, a.coin_reward, 'Achievement: ' || a.name, 'achievement', a.id);
  end if;
  return inserted = 1;
end $$;

-- Buy a cosmetic with coins. Locks the member row so concurrent purchases cannot overspend.
create function buy_cosmetic(p_member uuid, p_item uuid) returns text language plpgsql as $$
declare item cosmetic_items%rowtype; bal int;
begin
  perform 1 from members where id = p_member for update;
  select * into item from cosmetic_items where id = p_item;
  if not found then return 'not_found'; end if;
  if exists (select 1 from member_cosmetics where member_id = p_member and item_id = p_item) then return 'owned'; end if;
  select coalesce(sum(coins), 0) into bal from xp_transactions where member_id = p_member;
  if bal < item.cost_coins then return 'insufficient'; end if;
  insert into xp_transactions (member_id, event_key, amount, coins, reason, ref_type, ref_id)
  values (p_member, 'cosmetic:' || p_member || ':' || p_item, 0, -item.cost_coins, 'Unlocked ' || item.name, 'cosmetic', p_item);
  insert into member_cosmetics (member_id, item_id) values (p_member, p_item);
  return 'ok';
end $$;

-- ───────────────────────── lock down ─────────────────────────
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
    revoke all on all functions in schema public from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from authenticated;
    revoke all on all functions in schema public from authenticated;
  end if;
end $$;
