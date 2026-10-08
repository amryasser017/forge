# Integration / end-to-end checks

These run the real app in a real browser against a throw-away local stack (Postgres + PostgREST behind a `/rest/v1`
proxy, a mock Anthropic API). They are **not** part of `npm test` because they need extra tooling.

1. `npm i --no-save playwright-core` and have a Chromium available (set `PLAYWRIGHT_CHROMIUM` or edit `executablePath`).
2. `POSTGREST=/path/to/postgrest ./e2e/setup-local-stack.sh` and `export` the printed variables.
3. `npm run build && npx next start -p 3100`
4. `cd e2e && bash reset.sh && node flow-core.mjs` (login, measurements, workouts, PR + comparison, kitchen, challenges, export).
5. `node mock-ai.mjs &`, restart the app with the optional AI variables, then `node flow-crew.mjs`
   (member isolation, privacy opt-out, team challenge, AI food/coach/challenges, AI outage fallback, login rate limit).

Not covered here: Supabase Storage (progress photos) and the hosted Supabase service itself.
