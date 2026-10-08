import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';
const BASE = 'http://localhost:3100';
const sql = (q) => execSync(`psql -h /var/tmp/trio-pg -p 54329 -U postgres -d trio -Atc "${q}"`).toString().trim();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || "/opt/pw-browsers/chromium", args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `shots/${n}.png`, fullPage: true });
let bad = 0;
const ok = (m) => console.log('✔', m);
const check = (cond, m) => { if (cond) ok(m); else { bad++; console.log('✘ FAIL:', m); } };
const step = async (name, fn) => { try { await fn(); } catch (e) { bad++; console.log('✘ STEP FAILED:', name, '\n   ', String(e.message).split('\n')[0]); await shot('fail-' + name.replace(/\W+/g, '-')).catch(() => {}); } };

await page.goto(BASE + '/login');
await page.getByText('SHADY', { exact: true }).click();
await page.fill('input[name=password]', 'e2e-test-password');
await page.getByRole('button', { name: 'Enter TRIO FIT' }).click();
await page.waitForURL(BASE + '/');

await step('measurement', async () => {
  await page.goto(BASE + '/members/shady');
  await page.fill('input[name=weightKg]', '95');
  await page.fill('input[name=bodyFatPct]', '28');
  await page.fill('input[name=heightCm]', '178');
  await page.getByRole('button', { name: 'Save measurement' }).click();
  await page.waitForSelector('text=Measurement saved');
  await page.getByRole('button', { name: /Keep going/ }).click();
  await page.waitForSelector('text=95 kg');
  check(sql("select count(*) from body_measurements") === '1', 'measurement stored');
  check(sql("select sum(amount) from xp_transactions where event_key like 'measurement:%'") === '25', 'measurement XP = 25');
  // BMI
  check((await page.locator('body').innerText()).includes('30'), 'BMI shown');
  await shot('03-profile');
});

await step('workout-1', async () => {
  await page.goto(BASE + '/workouts/new');
  await page.fill('input[placeholder="e.g. Leg day"]', 'Leg day');
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await page.getByRole('button', { name: /Leg Press/ }).first().click();
  await page.waitForSelector('text=First time logging this exercise');
  const w = [80, 90, 100], r = [12, 10, 8];
  for (let i = 0; i < 3; i++) {
    if (i > 0) await page.getByRole('button', { name: 'Add set' }).click();
    await page.getByLabel(`Set ${i + 1} weight`).fill(String(w[i]));
    await page.getByLabel(`Set ${i + 1} reps`).fill(String(r[i]));
  }
  await shot('04-logger');
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page.waitForSelector('[role=dialog]');
  check(await page.locator('[role=dialog] >> text=XP').count() > 0, 'celebration shows XP');
  await page.getByRole('button', { name: /Keep going/ }).click();
  await page.waitForURL(/\/workouts\/[0-9a-f-]{36}$/);
  await page.waitForSelector('text=Baseline set');
  check(sql("select count(*) from xp_transactions where event_key like 'pr:%'") === '0', 'first session is baseline, no PR XP');
  check(sql("select count(*) from achievements a join member_achievements m on m.achievement_id=a.id where a.key='first-workout'") === '1', 'First Workout achievement granted');
  await shot('05-summary-1');
});

await step('workout-2-pr', async () => {
  // yesterday-style compare: same day => second session same day: no extra workout XP, but PR possible
  await page.goto(BASE + '/workouts/new?exercise=leg-press');
  await page.fill('input[placeholder="e.g. Leg day"]', 'Leg day 2');
  await page.waitForSelector('text=Last time');
  await page.getByRole('button', { name: /Copy last workout/ }).click();
  check((await page.getByLabel('Set 3 weight').inputValue()) === '100', 'copy last workout filled sets');
  await page.getByLabel('Set 3 weight').fill('110');
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page.waitForSelector('[role=dialog]');
  const txt = await page.locator('[role=dialog]').innerText();
  check(/New personal record/.test(txt), 'PR celebrated');
  await page.getByRole('button', { name: /Keep going/ }).click();
  await page.waitForURL(/\/workouts\/[0-9a-f-]{36}$/);
  await page.waitForSelector('text=Weight PR');
  check(sql("select count(*) from xp_transactions where event_key like 'workout:%'") === '1', 'only one workout XP per day');
  check(sql("select sum(amount) from xp_transactions where event_key like 'pr:%'") === '50', 'PR bonus 50');
  const body = await page.locator('body').innerText();
  check(/\+10/.test(body), 'comparison shows +10 kg');
  await shot('06-summary-2-pr');
  // edit does not double pay
  const before = sql('select sum(amount) from xp_transactions');
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.waitForSelector('text=Edit workout');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.waitForURL(/\/workouts\/[0-9a-f-]{36}$/);
  await page.waitForTimeout(800);
  check(sql('select sum(amount) from xp_transactions') === before, 'editing a workout does not pay XP twice');
});

await step('exercise-page', async () => {
  await page.goto(BASE + '/exercises/leg-press');
  await page.waitForSelector('text=No verified tutorial');
  check(await page.locator('a[href*="youtube.com/results"]').count() === 1, 'YouTube search fallback link shown');
  await page.fill('input[name=url]', 'https://example.com/watch?v=dQw4w9WgXcQ');
  await page.getByRole('button', { name: /Verify/ }).click();
  await page.waitForSelector('text=valid youtube');
  check(sql("select count(*) from exercises where youtube_url is not null") === '0', 'invalid video URL rejected');
  await shot('07-exercise');
});

await step('kitchen', async () => {
  await page.goto(BASE + '/kitchen');
  await page.getByRole('tab', { name: /Manual/ }).click();
  for (const [n, k, p] of [['Rice', 260, 5], ['Grilled chicken', 250, 46]]) {
    await page.fill('input[name=name]', n);
    await page.fill('input[name=quantity]', '200');
    await page.fill('input[name=calories]', String(k));
    await page.fill('input[name=proteinG]', String(p));
    await page.getByRole('button', { name: 'Add food' }).click();
    await page.waitForSelector(`text=${n}`);
  }
  check(sql("select count(*) from food_logs") === '2', 'two food entries stored');
  await page.getByRole('button', { name: 'Mark my day complete' }).click();
  await page.waitForSelector('[role=dialog]');
  await page.getByRole('button', { name: /Keep going/ }).click();
  check(sql("select sum(amount) from xp_transactions where event_key like 'food:%'") === '40', 'food-complete XP 40');
  await page.getByRole('button', { name: '+500 ml' }).first().click();
  await page.waitForSelector('text=500');
  check(sql("select sum(ml) from water_logs") === '500', 'water stored');
  await shot('08-kitchen');
});

await step('team', async () => {
  await page.goto(BASE + '/team');
  await page.getByRole('button', { name: /Create this week/ }).click();
  await page.waitForSelector('text=Show up this week');
  check(sql("select count(*) from challenges") === '3', 'three default challenges created');
  await page.getByRole('button', { name: /Create this week/ }).click();
  await page.waitForTimeout(1200);
  check(sql("select count(*) from challenges") === '3', 'defaults are not duplicated');
  check(sql("select count(*) from challenge_events where challenge_id in (select id from challenges where metric='workout_sessions' and scope='individual')") === '2', 'challenge progress rebuilt from sessions (2 sessions)');
  await shot('09-team');
  await page.goto(BASE + '/team/hall');
  await page.waitForSelector('text=Hall of Fame');
  await shot('10-hall');
});

await step('coach+settings', async () => {
  await page.goto(BASE + '/coach'); await page.waitForSelector('text=Your last 4 weeks'); await shot('11-coach');
  if (!process.env.AI_ON) check(await page.locator('text=AI features are off').count() === 1, 'AI-off notice shown, page still works');
  await page.goto(BASE + '/settings'); await page.waitForSelector('text=Avatar shop'); await shot('12-settings');
  await page.goto(BASE + '/'); await page.waitForSelector('text=The Trio'); await shot('13-dashboard-after');
});

await step('export', async () => {
  const r = await ctx.request.get(BASE + '/api/export');
  check(r.status() === 200 && (await r.json()).member.slug === 'shady', 'export returns own data');
});

console.log('xp total (shady):', sql("select xp_total from member_totals t join members m on m.id=t.member_id where slug='shady'"));
console.log('errors:', errors);
console.log(bad ? `FAILURES: ${bad}` : 'ALL OK');
await browser.close();
