-- 0001_schema.sql
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

-- 0002_storage.sql
-- Private bucket for progress photos (Supabase only; skipped on plain Postgres). Files are served through signed URLs.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false) on conflict (id) do nothing;
  end if;
end $$;

-- 0003_seed.sql
-- Seed data (reference data only: no fake measurements, workouts or achievement histories).
insert into members (id, slug, name, display_name, avatar_url) values
  ('00000000-0000-4000-8000-000000000001','amr','AMR','AMR','/avatars/amr.png'),
  ('00000000-0000-4000-8000-000000000002','aman','AMAN','AMAN','/avatars/aman.png'),
  ('00000000-0000-4000-8000-000000000003','shady','SHADY','SHADY','/avatars/shady.png')
on conflict (slug) do nothing;
insert into member_goals (member_id) select id from members on conflict do nothing;
insert into app_settings (key, value) values ('timezone', '"Africa/Cairo"'::jsonb) on conflict (key) do nothing;
insert into exercise_categories (slug, name, sort_order) values
  ('upper-body','Upper Body',0),
  ('lower-body','Lower Body',1),
  ('push','Push',2),
  ('pull','Pull',3),
  ('legs','Legs',4),
  ('core','Core',5),
  ('cardio','Cardio',6),
  ('free-weights','Free Weights',7)
on conflict (slug) do nothing;
insert into exercises (slug, name, kind, equipment, primary_muscles, secondary_muscles, instructions, safety_notes, youtube_query) values
  ('leg-press','Leg Press','resistance','Leg press machine',array['Quadriceps','Glutes']::text[],array['Hamstrings','Calves']::text[],'Sit with your back and hips flat on the pad and place your feet shoulder-width on the platform. Lower the platform under control until your knees are bent about 90 degrees, then press through your whole foot without locking the knees.','Keep your lower back and hips on the pad, never bounce at the bottom, and do not lock out your knees at the top.','Leg Press proper form tutorial'),
  ('barbell-squat','Barbell Back Squat','resistance','Barbell and rack',array['Quadriceps','Glutes']::text[],array['Hamstrings','Core','Lower back']::text[],'Set the bar across your upper back, brace your core, and sit down and back while keeping your chest up and knees tracking over your toes. Drive up through the middle of your feet.','Use safety bars in the rack, keep a neutral spine, and choose a weight that lets you keep control of every rep.','Barbell Back Squat proper form tutorial'),
  ('goblet-squat','Goblet Squat','resistance','Dumbbell or kettlebell',array['Quadriceps','Glutes']::text[],array['Core']::text[],'Hold one weight close to your chest, sit between your hips with your chest tall, then stand back up.','Keep your heels down and your spine neutral. Start light to learn the pattern.','Goblet Squat proper form tutorial'),
  ('leg-extension','Leg Extension','resistance','Leg extension machine',array['Quadriceps']::text[],'{}'::text[],'Adjust the pad to sit just above your ankles and the back pad so your knees line up with the machine pivot. Extend your legs smoothly, pause briefly, then lower slowly.','Avoid swinging or using momentum, and use a moderate weight if you have knee discomfort.','Leg Extension proper form tutorial'),
  ('hamstring-curl','Seated Hamstring Curl','resistance','Leg curl machine',array['Hamstrings']::text[],array['Calves']::text[],'Set the pad just above your heels and the thigh pad snug. Curl your heels toward you, squeeze, and return with control.','Do not lift your hips or jerk the weight. Control the lowering phase.','Seated Hamstring Curl proper form tutorial'),
  ('standing-calf-raise','Standing Calf Raise','resistance','Calf raise machine or step',array['Calves']::text[],'{}'::text[],'Rise onto the balls of your feet as high as you can, pause at the top, then lower until you feel a stretch.','Move slowly and use a full range of motion rather than a heavy bounce.','Standing Calf Raise proper form tutorial'),
  ('romanian-deadlift','Romanian Deadlift','resistance','Barbell or dumbbells',array['Hamstrings','Glutes']::text[],array['Lower back','Core']::text[],'With a soft knee bend, push your hips back while the weight slides down your legs and your back stays flat. Stand by driving your hips forward.','Keep the weight close to your body and stop the descent when your back would start to round.','Romanian Deadlift proper form tutorial'),
  ('walking-lunge','Walking Lunge','resistance','Bodyweight or dumbbells',array['Quadriceps','Glutes']::text[],array['Hamstrings','Core']::text[],'Step forward into a long stride, lower your back knee toward the floor, then push through the front foot into the next step.','Keep your torso upright and your front knee stable over your foot.','Walking Lunge proper form tutorial'),
  ('hip-thrust','Hip Thrust','resistance','Bench and barbell or machine',array['Glutes']::text[],array['Hamstrings']::text[],'Rest your upper back on a bench with the weight over your hips. Drive through your heels until your torso is level with the floor, squeeze, and lower under control.','Tuck your chin slightly, avoid over-arching your lower back, and pad the bar.','Hip Thrust proper form tutorial'),
  ('chest-press-machine','Chest Press (Machine)','resistance','Chest press machine',array['Chest']::text[],array['Triceps','Shoulders']::text[],'Set the seat so the handles line up with the middle of your chest. Press forward without locking out, then return slowly until you feel a light chest stretch.','Keep your shoulder blades back against the pad and do not let your shoulders roll forward.','Chest Press (Machine) proper form tutorial'),
  ('bench-press','Barbell Bench Press','resistance','Barbell and bench',array['Chest']::text[],array['Triceps','Shoulders']::text[],'Lie with your eyes under the bar, feet planted and shoulder blades pulled together. Lower the bar to your mid-chest, then press it back up over your shoulders.','Use a spotter or safety arms, and never use a thumbless grip.','Barbell Bench Press proper form tutorial'),
  ('incline-dumbbell-press','Incline Dumbbell Press','resistance','Dumbbells and incline bench',array['Upper chest']::text[],array['Shoulders','Triceps']::text[],'Set the bench to a low-to-moderate incline. Press the dumbbells up and slightly together, then lower them to chest level with your elbows at roughly 45 degrees.','Do not flare your elbows out wide, and bring the weights to the starting position carefully.','Incline Dumbbell Press proper form tutorial'),
  ('machine-shoulder-press','Shoulder Press (Machine)','resistance','Shoulder press machine',array['Shoulders']::text[],array['Triceps']::text[],'Adjust the seat so the handles start near shoulder height. Press upward without shrugging, then lower with control.','Keep your ribs down and avoid arching your lower back.','Shoulder Press (Machine) proper form tutorial'),
  ('dumbbell-shoulder-press','Dumbbell Shoulder Press','resistance','Dumbbells',array['Shoulders']::text[],array['Triceps','Core']::text[],'Hold the dumbbells at shoulder height, brace your core, and press overhead until your arms are almost straight, then lower under control.','Do not lean back excessively, and use lighter weights if you cannot keep your torso steady.','Dumbbell Shoulder Press proper form tutorial'),
  ('lateral-raise','Dumbbell Lateral Raise','resistance','Dumbbells',array['Shoulders']::text[],'{}'::text[],'With a slight bend in your elbows, raise the dumbbells out to the sides to about shoulder height and lower slowly.','Use light weights and do not swing your body to lift them.','Dumbbell Lateral Raise proper form tutorial'),
  ('triceps-pushdown','Cable Triceps Pushdown','resistance','Cable machine',array['Triceps']::text[],'{}'::text[],'Keep your elbows pinned at your sides and push the handle down until your arms are straight, then let it rise under control.','Avoid leaning over the weight or letting your elbows drift forward.','Cable Triceps Pushdown proper form tutorial'),
  ('pec-deck-fly','Pec Deck Fly','resistance','Pec deck machine',array['Chest']::text[],array['Shoulders']::text[],'Sit with your back against the pad and bring the handles together in front of your chest with a soft bend in your elbows, then open slowly.','Stop the opening phase when you feel a comfortable stretch, not a strain in your shoulders.','Pec Deck Fly proper form tutorial'),
  ('lat-pulldown','Lat Pulldown','resistance','Cable machine',array['Lats']::text[],array['Biceps','Upper back']::text[],'Grip the bar slightly wider than your shoulders, lean back a little, and pull the bar to your upper chest by driving your elbows down. Let it rise under control.','Do not pull the bar behind your neck and avoid swinging your torso.','Lat Pulldown proper form tutorial'),
  ('seated-cable-row','Seated Cable Row','resistance','Cable machine',array['Upper back','Lats']::text[],array['Biceps']::text[],'Sit tall with a slight knee bend, pull the handle to your lower ribs while squeezing your shoulder blades together, then extend your arms slowly.','Keep your torso steady and do not round your back to reach forward.','Seated Cable Row proper form tutorial'),
  ('pull-up','Pull-Up / Assisted Pull-Up','resistance','Pull-up bar or assisted machine',array['Lats']::text[],array['Biceps','Upper back','Core']::text[],'Start from a full hang, pull your chest toward the bar by driving your elbows down, and lower fully under control. Use assistance if you cannot do full reps yet.','Avoid kipping or swinging. Use the assisted machine to build up gradually.','Pull-Up / Assisted Pull-Up proper form tutorial'),
  ('bent-over-row','Bent-Over Barbell Row','resistance','Barbell',array['Upper back','Lats']::text[],array['Biceps','Lower back']::text[],'Hinge at your hips with a flat back, pull the bar toward your lower ribs, then lower it with control.','Keep your spine neutral, and reduce the weight if your back starts to round.','Bent-Over Barbell Row proper form tutorial'),
  ('dumbbell-biceps-curl','Dumbbell Biceps Curl','resistance','Dumbbells',array['Biceps']::text[],array['Forearms']::text[],'Keep your elbows near your sides, curl the dumbbells up while rotating your palms toward your shoulders, and lower slowly.','Do not swing your torso to lift the weight.','Dumbbell Biceps Curl proper form tutorial'),
  ('hammer-curl','Hammer Curl','resistance','Dumbbells',array['Biceps','Forearms']::text[],'{}'::text[],'Hold the dumbbells with palms facing each other and curl up without rotating your wrists, then lower under control.','Keep your elbows still and your shoulders relaxed.','Hammer Curl proper form tutorial'),
  ('face-pull','Cable Face Pull','resistance','Cable machine with rope',array['Rear shoulders','Upper back']::text[],'{}'::text[],'Set the cable at about face height. Pull the rope toward your face, separating the ends as your elbows go high and wide, then return slowly.','Use a light weight and keep your ribs down.','Cable Face Pull proper form tutorial'),
  ('deadlift','Conventional Deadlift','resistance','Barbell',array['Glutes','Hamstrings','Lower back']::text[],array['Upper back','Core','Forearms']::text[],'Stand with the bar over mid-foot, hinge down with a flat back, brace your core, and stand up by pushing the floor away while keeping the bar close.','Learn the movement with light weights first and never round your lower back under load.','Conventional Deadlift proper form tutorial'),
  ('plank','Plank','resistance','Bodyweight',array['Core']::text[],array['Shoulders','Glutes']::text[],'Support yourself on your forearms and toes with a straight line from head to heels, squeezing your glutes and keeping your breathing steady.','Stop the set when your hips sag or your lower back aches. Record time as reps in seconds.','Plank proper form tutorial'),
  ('cable-crunch','Cable Crunch','resistance','Cable machine with rope',array['Abs']::text[],'{}'::text[],'Kneel under the cable, hold the rope by your head, and curl your ribs toward your hips, then return slowly.','Move from your abs rather than pulling with your arms, and keep the weight moderate.','Cable Crunch proper form tutorial'),
  ('hanging-leg-raise','Hanging Leg Raise','resistance','Pull-up bar',array['Abs','Hip flexors']::text[],array['Forearms']::text[],'Hang with straight arms, raise your knees or legs toward your waist without swinging, then lower under control.','Start with bent knees and stop if you cannot control the swing.','Hanging Leg Raise proper form tutorial'),
  ('russian-twist','Russian Twist','resistance','Bodyweight or light weight',array['Obliques']::text[],array['Abs']::text[],'Sit leaning back slightly with your feet lifted or grounded, and rotate your torso side to side with control.','Keep your back long and skip the weight if you cannot rotate without rounding.','Russian Twist proper form tutorial'),
  ('treadmill','Treadmill','cardio','Treadmill',array['Cardiovascular system','Legs']::text[],'{}'::text[],'Choose a speed and incline you can sustain, keep an upright posture and a relaxed stride, and cool down gradually.','Do not hold the rails for balance at speed, and clip the safety key to your clothes.','Treadmill proper form tutorial'),
  ('stationary-bike','Stationary Bike','cardio','Stationary bike',array['Cardiovascular system','Quadriceps']::text[],array['Calves']::text[],'Adjust the seat so your knee is slightly bent at the bottom of the pedal stroke and pedal at a steady cadence.','Increase resistance gradually and keep your shoulders relaxed.','Stationary Bike proper form tutorial'),
  ('elliptical','Elliptical','cardio','Elliptical machine',array['Cardiovascular system','Legs']::text[],'{}'::text[],'Stand tall, keep your feet flat on the pedals, and use a smooth, steady stride.','Avoid leaning heavily on the handles.','Elliptical proper form tutorial'),
  ('rowing-machine','Rowing Machine','cardio','Rowing machine',array['Cardiovascular system','Back','Legs']::text[],array['Arms']::text[],'Drive with your legs first, then lean back slightly and pull the handle to your ribs. Reverse the order on the return.','Do not round your back and avoid yanking the handle at the start.','Rowing Machine proper form tutorial'),
  ('stair-climber','Stair Climber','cardio','Stair machine',array['Cardiovascular system','Glutes']::text[],array['Quadriceps']::text[],'Step with your whole foot, stand tall, and keep a steady pace without leaning on the rails.','Use the handles for light balance only and keep the pace controllable.','Stair Climber proper form tutorial'),
  ('walking','Walking','cardio','None',array['Cardiovascular system','Legs']::text[],'{}'::text[],'Walk at a brisk, comfortable pace with relaxed shoulders and natural arm swing.','Wear supportive shoes and build distance gradually.','Walking proper form tutorial'),
  ('running','Running','cardio','None or treadmill',array['Cardiovascular system','Legs']::text[],'{}'::text[],'Run at a pace where you can still breathe in a controlled way, landing under your body with a relaxed stride.','Warm up first and increase weekly distance gradually.','Running proper form tutorial')
on conflict (slug) do nothing;
insert into exercise_category_links (exercise_id, category_id)
select e.id, c.id from (values
  ('leg-press','lower-body'),
  ('leg-press','legs'),
  ('barbell-squat','lower-body'),
  ('barbell-squat','legs'),
  ('barbell-squat','free-weights'),
  ('goblet-squat','lower-body'),
  ('goblet-squat','legs'),
  ('goblet-squat','free-weights'),
  ('leg-extension','lower-body'),
  ('leg-extension','legs'),
  ('hamstring-curl','lower-body'),
  ('hamstring-curl','legs'),
  ('standing-calf-raise','lower-body'),
  ('standing-calf-raise','legs'),
  ('romanian-deadlift','lower-body'),
  ('romanian-deadlift','legs'),
  ('romanian-deadlift','pull'),
  ('romanian-deadlift','free-weights'),
  ('walking-lunge','lower-body'),
  ('walking-lunge','legs'),
  ('walking-lunge','free-weights'),
  ('hip-thrust','lower-body'),
  ('hip-thrust','legs'),
  ('chest-press-machine','upper-body'),
  ('chest-press-machine','push'),
  ('bench-press','upper-body'),
  ('bench-press','push'),
  ('bench-press','free-weights'),
  ('incline-dumbbell-press','upper-body'),
  ('incline-dumbbell-press','push'),
  ('incline-dumbbell-press','free-weights'),
  ('machine-shoulder-press','upper-body'),
  ('machine-shoulder-press','push'),
  ('dumbbell-shoulder-press','upper-body'),
  ('dumbbell-shoulder-press','push'),
  ('dumbbell-shoulder-press','free-weights'),
  ('lateral-raise','upper-body'),
  ('lateral-raise','push'),
  ('lateral-raise','free-weights'),
  ('triceps-pushdown','upper-body'),
  ('triceps-pushdown','push'),
  ('pec-deck-fly','upper-body'),
  ('pec-deck-fly','push'),
  ('lat-pulldown','upper-body'),
  ('lat-pulldown','pull'),
  ('seated-cable-row','upper-body'),
  ('seated-cable-row','pull'),
  ('pull-up','upper-body'),
  ('pull-up','pull'),
  ('bent-over-row','upper-body'),
  ('bent-over-row','pull'),
  ('bent-over-row','free-weights'),
  ('dumbbell-biceps-curl','upper-body'),
  ('dumbbell-biceps-curl','pull'),
  ('dumbbell-biceps-curl','free-weights'),
  ('hammer-curl','upper-body'),
  ('hammer-curl','pull'),
  ('hammer-curl','free-weights'),
  ('face-pull','upper-body'),
  ('face-pull','pull'),
  ('deadlift','lower-body'),
  ('deadlift','pull'),
  ('deadlift','free-weights'),
  ('plank','core'),
  ('cable-crunch','core'),
  ('hanging-leg-raise','core'),
  ('russian-twist','core'),
  ('treadmill','cardio'),
  ('stationary-bike','cardio'),
  ('elliptical','cardio'),
  ('rowing-machine','cardio'),
  ('stair-climber','cardio'),
  ('walking','cardio'),
  ('running','cardio')
) as v(es, cs) join exercises e on e.slug = v.es join exercise_categories c on c.slug = v.cs
on conflict do nothing;
insert into achievements (key, name, description, icon, rule, xp_reward, coin_reward) values
  ('first-workout','First Workout','Log your first completed workout.','dumbbell','{"type": "workouts", "threshold": 1}'::jsonb,25,10),
  ('seven-day-warrior','Seven-Day Warrior','Reach a 7-day workout streak.','flame','{"type": "workout_streak", "threshold": 7}'::jsonb,100,30),
  ('new-personal-record','New Personal Record','Beat your previous best on an exercise.','trophy','{"type": "prs", "threshold": 1}'::jsonb,50,20),
  ('consistency-king','Consistency King','Complete at least 80% of planned workouts across 4 weeks (and at least 8 sessions).','crown','{"type": "consistency_4w", "threshold": 80}'::jsonb,150,40),
  ('kitchen-honest','Kitchen Honest','Mark 7 days with a complete, honest food log.','utensils','{"type": "food_days", "threshold": 7}'::jsonb,100,30),
  ('trio-united','Trio United','Complete a team challenge together.','users','{"type": "team_challenge", "threshold": 1}'::jsonb,100,40),
  ('comeback-champion','Comeback Champion','Return to a workout after a break of 7 days or more.','rotate-ccw','{"type": "comeback", "threshold": 7}'::jsonb,75,25),
  ('level-5','Level 5','Reach level 5.','star','{"type": "level", "threshold": 5}'::jsonb,0,50)
on conflict (key) do nothing;
insert into cosmetic_items (key, kind, name, value, cost_coins) values
  ('title-rookie-plus','title','Title: Gym Regular','Gym Regular',50),
  ('title-iron','title','Title: Iron Mind','Iron Mind',120),
  ('title-legend','title','Title: Trio Legend','Trio Legend',300),
  ('frame-orange','frame','Frame: Sunrise Orange','#F28C28',60),
  ('frame-sky','frame','Frame: Sky Blue','#83D3F5',60),
  ('frame-green','frame','Frame: Fresh Green','#8DDE75',60),
  ('frame-navy','frame','Frame: Midnight Navy','#172B4D',150)
on conflict (key) do nothing;

