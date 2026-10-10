# TRIO FIT

> Three friends. One mission. Stronger every day.

A private fitness + gamification web app for **AMR, AMAN and SHADY**: body analytics, a fast workout logger with
set-by-set comparison and personal records, a food diary, XP / levels / achievements / streaks, fair leaderboards,
team challenges and boss battles, and an AI coach that only talks about verified data.

Stack: Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS 3 · Supabase (Postgres) · Recharts · Framer Motion · Zod.

## What is in the app

| Page | What it does |
| --- | --- |
| `/login` | Pick who you are + crew password. No sign-up. |
| `/` Dashboard | Three member cards (level, weight, body fat, streak, weekly planned vs done), weekly XP board, active challenges, recent PRs/achievements, water + daily check-in. |
| `/members/[slug]` | Body analytics: weight / body-fat / waist trends (7/30/90 days / all), BMI, fat & lean mass, first-vs-latest, scan-report fields (muscle, water, visceral, BMR), goals, history with edit/delete, private progress photos (opt-in sharing). |
| `/workouts` | Arena: recent sessions + searchable exercise library (categories, custom exercises). |
| `/workouts/new`, `/workouts/[id]/edit` | Phone-first logger: sets, reps, kg, rest, cardio metrics, **Copy last workout**, rest timer, draft auto-restore. |
| `/workouts/[id]` | Summary: XP earned, set-by-set vs last time, volume change, PR badges, encouragement. Duplicate / edit / delete. |
| `/exercises/[slug]` | Technique, safety notes, verified YouTube video (or search fallback), your history + charts, crew standing on that machine. |
| `/kitchen` | Food diary by meal, targets, quick-add / Open Food Facts search / AI assistant / manual, saved meals, water, "complete & honest day", 7-day view (unlogged days are *unknown*, not zero), meal ideas. |
| `/coach` | Data-driven 4-week summary (works without AI), 4-vs-4-week comparison, AI summary & Q&A, safe challenge suggestions, encouragement feed. |
| `/team` | 5 leaderboards (with formulas shown), MVP categories, challenges / team boss battles / 1-v-1 battles, Trio calendar. `/team/hall`: Hall of Fame. |
| `/settings` | Name, training days, tone & language of messages, privacy, theme, avatar shop (coins buy looks only), reward values, JSON export. |

## Setup

1. **Create a Supabase project.** In *SQL Editor* paste the single file `supabase/setup.sql` (all three migrations
   combined; regenerate with `npm run db:sql > supabase/setup.sql`). Or run the files in `supabase/migrations/` in order:
   `0001_schema.sql` (tables, RLS, reward functions) → `0002_storage.sql` (private photo bucket) → `0003_seed.sql`
   (the 3 members, 36 exercises, achievements, cosmetics). Re-running the seed is safe (idempotent).
2. **Environment variables** (see `.env.example`). Put them in `.env.local` for development and in your host for production:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Project settings → API). **Server only**, never `NEXT_PUBLIC_`.
   - `GATE_PASSWORD` = the crew password, *or* `GATE_PASSWORD_HASH` from `npm run hash-password -- "your password"`.
   - `SESSION_SECRET` = 32+ random characters (`openssl rand -hex 32`).
   - Optional: `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL`), `APP_TIMEZONE` (default `Africa/Cairo`).
3. `npm install && npm run dev`.
4. **Deploy on Vercel**: import the repo, set **Root Directory = `trio-fit`**, add the same env vars. (This repo also contains
   the older Forge app at its root; it is untouched.)

Without `ANTHROPIC_API_KEY` everything works; AI-only features show a clear message and rules-based, data-driven
encouragement is used instead.

## Security model

- The browser **never talks to the database**. All reads/writes happen in Server Components/Actions using the Supabase
  service-role key, which only exists in server env vars. RLS is **enabled on every table with no policies**, so the
  `anon`/`authenticated` keys can read nothing even if someone found the project URL.
- Entry = shared crew password verified on the server (constant-time compare; optional scrypt hash) + choosing who you are.
  A signed (HS256) `HttpOnly`, `SameSite=Lax`, `Secure` (prod) cookie carries `{memberId}`; 14-day expiry.
  **Login rate limit:** 5 failures / 15 minutes per (HMAC-hashed) IP, stored in `login_attempts`.
- The member id always comes from the session, never from form fields. Every mutation checks ownership (`assertOwner`).
  Other members can see only what is shared: level, streaks, PRs, achievements, and weight/body-fat unless you switch
  "share with crew" off. Food, check-ins, notes and photos are private (photos are opt-in per photo, served by signed URLs).
- Honest limitation: with one shared password, anyone who knows it can *choose* to sign in as any member. The data model
  already has a `member_id` on everything, so moving to per-person logins (Supabase Auth + RLS policies using `auth.uid()`)
  is the natural next step.
- Security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`), zod validation on every input, no secrets in the client bundle.

## Rules & calculations (all in code, unit-tested; the AI never does maths)

- **BMI** = kg / m². Shown with a note that it is a screening number, not body fat. **Fat mass** = weight × body-fat% / 100. **Lean mass** = weight − fat mass.
  % change returns *nothing* (not 0, not ∞) when the baseline is missing or zero. Target progress works for loss and gain.
- **Training volume** = Σ weight × reps over resistance sets. Comparison is always against *your own* latest earlier session of
  the *same* exercise: top weight, total reps, volume, set-by-set. Improvement is only claimed when comparable data exists.
- **PR** = top weight (≥1 rep) strictly above every earlier session of that exercise. The *first* session is a baseline and can
  never be a PR (no free XP). A volume PR is highlighted but only weight PRs pay the bonus.
- **XP rules** (editable in Settings, defaults): workout 100 (once per day) · complete honest food day 40 · water target 20 ·
  measurement 25 (once per day) · PR +50 · individual challenge 100 · team challenge 75. Coins = 1 per 10 XP (cosmetics only).
- **Idempotent rewards:** `xp_transactions` is an append-only ledger with a **UNIQUE `event_key`** and the Postgres function
  `award_xp()` inserts `ON CONFLICT DO NOTHING`. Re-saving, editing, double-clicking or retrying cannot pay twice. Totals are derived
  (`member_totals` view). Rewards are *not* clawed back if a record is later deleted or edited.
- **Levels:** leaving level *L* costs `100 + 50·(L−1)` XP, i.e. cumulative `100(L−1) + 25(L−1)(L−2)` to reach level *L*. Always harder.
- **Streaks:** your schedule = training weekdays (Settings). Workout streak = consecutive days with a workout; a *rest day* never
  breaks it, a missed *planned* day does, and today never breaks it while pending. The current schedule is applied to all history.
  Workouts on rest days count. Logging streak = any logged activity. Day boundaries use `APP_TIMEZONE`. Weeks start on Saturday (`WEEK_STARTS_ON` in `src/lib/domain/time.ts`).
  "Comeback" (≥7 days away) is rewarded with an achievement, never punished.
- **Leaderboards** (formulas shown on the page): Overall XP · Consistency (completed ÷ planned days, vs *your* schedule) ·
  Personal improvement (avg % volume change first→latest per exercise, vs yourself) · Nutrition logging (complete days ÷ days) ·
  Team contribution. No board ranks body weight or the heaviest weight.
- **Challenges** only count safe habits (sessions, food-log days, water-target days, measurements, PRs, check-ins), with capped
  targets and ≤31-day windows. Progress is rebuilt from source records with deterministic keys, so edits/deletes stay consistent.
  AI-suggested challenges are re-validated server-side and the server sets the reward.

## AI

`src/lib/ai/provider.ts` is a small provider interface (Anthropic Messages API via `fetch`, 20 s timeout, never throws into the UI).
The model only sees a **verified digest** computed by code (`buildDigest`) plus the user's question, with guard-rails to never
invent numbers. Structured outputs (food drafts, challenge suggestions, meal ideas) are parsed and zod-validated; anything
malformed is dropped. Encouragement messages are deterministic templates built from real events; the optional AI polish is
accepted **only if it keeps exactly the same numbers** (`isFaithfulRewrite`). Food drafts are never saved without your
confirmation and are stored as unverified `ai_estimate`.

## YouTube videos

No video URL is shipped (none were verifiable offline). Each exercise shows a YouTube *search* link until someone pastes a
link on the exercise page: it must be a real YouTube URL shape **and** pass YouTube's oEmbed check before it is stored and
embedded (privacy-friendly `youtube-nocookie.com`).

## Testing

```
npm run typecheck   # tsc --noEmit (strict)
npm run lint
npm test            # 62 tests: calculations, XP/levels, streaks, challenges, leaderboard, validation, sessions,
                    # password gate, authorization guard, AI-output parsing, and the SQL migrations + reward functions
                    # run against an in-memory Postgres (PGlite)
npm run build
```
`e2e/` contains browser-level flows against a local Postgres + PostgREST stack (see `e2e/README.md`).

## Known limits / next steps

- Verified locally against Postgres + PostgREST, **not** against a hosted Supabase project; progress-photo upload (Supabase
  Storage) was not exercised locally.
- Scan-report **OCR** is not implemented; the schema (`source`, `report_details`, scan fields) is ready for it.
- Notifications are in-app messages only (no push/email). Weight is kg-only. PWA = manifest only (no offline mode).
- Single shared password (see Security model).
