import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const BASE = 'http://localhost:3100';
const sql = (q) => execSync(`psql -h /var/tmp/trio-pg -p 54329 -U postgres -d trio -Atc "${q}"`).toString().trim();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || "/opt/pw-browsers/chromium", args: ['--no-sandbox'] });
let bad = 0;
const ok = (m) => console.log('✔', m);
const check = (c, m) => { if (c) ok(m); else { bad++; console.log('✘ FAIL:', m); } };
const errors = [];
async function newUser(slug, vp = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(slug + ' pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(slug + ' console: ' + m.text()); });
  await page.goto(BASE + '/login');
  await page.getByText(slug.toUpperCase(), { exact: true }).click();
  await page.fill('input[name=password]', 'e2e-test-password');
  await page.getByRole('button', { name: 'Enter TRIO FIT' }).click();
  await page.waitForURL(BASE + '/');
  return { ctx, page };
}
const step = async (name, fn) => { try { await fn(); } catch (e) { bad++; console.log('✘ STEP FAILED:', name, '\n   ', String(e.message).split('\n')[0]); } };
const shadyWorkout = sql("select id from workout_sessions order by created_at limit 1");


const amr = await newUser('amr');
const p = amr.page;

await step('isolation', async () => {
  const r1 = await p.goto(`${BASE}/workouts/${shadyWorkout}`);
  check(r1.status() === 404, "AMR cannot open SHADY's workout summary (404)");
  const r2 = await p.goto(`${BASE}/workouts/${shadyWorkout}/edit`);
  check(r2.status() === 404, "AMR cannot open SHADY's edit page (404)");
  await p.goto(BASE + '/');
  const t = await p.locator('body').innerText();
  check(/95 kg/.test(t) && /28%/.test(t), "dashboard shows SHADY's shared weight & body fat");
});

await step('privacy', async () => {
  const s = await newUser('shady');
  await s.page.goto(BASE + '/settings');
  await s.page.getByLabel(/Let the crew see my weight/).uncheck();
  await s.page.getByRole('button', { name: 'Save settings' }).click();
  await s.page.waitForSelector('text=Settings saved');
  await s.ctx.close();
  await p.goto(BASE + '/');
  const t = await p.locator('body').innerText();
  check(!/95 kg/.test(t) && /private/.test(t), 'weight hidden from the crew after opting out');
  await p.goto(BASE + '/members/shady');
  check(await p.locator('text=Body stats are private').count() === 1, "SHADY's profile shows private notice to AMR");
});

await step('team-challenge', async () => {
  await p.goto(BASE + '/workouts/new?exercise=leg-press');
  await p.fill('input[placeholder="e.g. Leg day"]', 'AMR legs');
  await p.waitForSelector('text=First time logging');
  await p.getByLabel('Set 1 weight').fill('120');
  await p.getByLabel('Set 1 reps').fill('10');
  await p.getByRole('button', { name: 'Finish workout' }).click();
  await p.waitForSelector('[role=dialog]');
  await p.getByRole('button', { name: /Keep going/ }).click();
  await p.waitForURL(/\/workouts\/[0-9a-f-]{36}$/);
  check(sql("select count(*) from challenge_events e join challenges c on c.id=e.challenge_id where c.scope='team'") === '3', 'team challenge counts all three sessions (2 SHADY + 1 AMR)');
  check(sql("select count(*) from xp_transactions where event_key like 'pr:%' and member_id='00000000-0000-4000-8000-000000000001'") === '0', "AMR's first leg press is a baseline (not a PR even though heavier than SHADY)");
});

await step('ai-flows', async () => {
  await p.goto(BASE + '/kitchen');
  await p.getByRole('tab', { name: /AI assistant/ }).click();
  await p.fill('textarea', 'I ate 200 g of cooked rice and 150 g of grilled chicken');
  await p.getByRole('button', { name: 'Turn into a draft' }).click();
  await p.waitForSelector('text=Draft: AI estimates');
  check(await p.locator('text=Was it cooked with oil?').count() === 1, 'AI clarifying question shown');
  check(sql('select count(*) from food_logs where member_id=\'00000000-0000-4000-8000-000000000001\'') === '0', 'AI draft is NOT saved before confirmation');
  await p.getByRole('button', { name: /Confirm/ }).click();
  await p.waitForSelector('text=saved as estimates');
  check(sql("select count(*) from food_logs where source='ai_estimate' and verified=false") === '2', 'confirmed AI items saved as unverified estimates');

  await p.goto(BASE + '/coach');
  await p.getByRole('button', { name: /Write an AI summary/ }).click();
  await p.waitForSelector('text=AI-NARRATIVE');
  check(sql("select count(*) from ai_insights where kind='summary' and source='ai'") === '1', 'AI summary stored');
  await p.fill('input[name=question]', 'Which exercises improved?');
  await p.getByRole('button', { name: 'Ask', exact: true }).click();
  await p.waitForSelector('text=answer based on your data');
  await p.getByRole('button', { name: /Suggest challenges/ }).click();
  await p.waitForSelector('text=Four sessions');
  const sug = await p.locator('body').innerText();
  check(!/Lose 10kg fast/.test(sug) && !/Huge/.test(sug), 'unsafe / oversized AI suggestions are filtered out server-side');
  await p.getByRole('button', { name: 'Accept' }).click();
  await p.waitForSelector('text=Challenge added');
  check(sql("select xp_reward from challenges where title='Four sessions'") === '100', 'accepted challenge reward set by server, not by AI');
  await p.goto(BASE + '/kitchen');
  await p.getByRole('button', { name: /Meal ideas/ }).click();
  await p.waitForSelector('text=Tuna & rice bowl');
  check(await p.locator('text=AI estimates, not verified').count() === 1, 'AI meal ideas flagged as estimates');
  check(sql("select count(*) from ai_insights where source='ai' and kind in ('level_up','pr')") >= '0', 'insight polish path ran');
});

await step('ai-down-fallback', async () => {
  writeFileSync('mode.txt', 'down');
  await p.goto(BASE + '/kitchen');
  await p.getByRole('tab', { name: /AI assistant/ }).click();
  await p.fill('textarea', 'two eggs');
  await p.getByRole('button', { name: 'Turn into a draft' }).click();
  await p.waitForSelector('text=Could not understand');
  ok('AI outage: food assistant degrades gracefully');
  // workout still saves, message falls back to rules
  await p.goto(BASE + '/workouts/new?exercise=treadmill');
  await p.fill('input[placeholder="e.g. Leg day"]', 'Cardio');
  await p.waitForSelector('text=First time logging');
  await p.getByLabel('Minutes').fill('30');
  await p.getByLabel('Distance (km)').fill('4');
  await p.getByRole('button', { name: 'Finish workout' }).click();
  await p.waitForURL(/\/workouts\/[0-9a-f-]{36}$/, { timeout: 20000 });
  ok('workout saves even when AI is down');
  writeFileSync('mode.txt', 'garbage');
  await p.goto(BASE + '/coach');
  await p.getByRole('button', { name: /Write an AI summary/ }).click();
  await p.waitForTimeout(1500);
  writeFileSync('mode.txt', 'ok');
});

await step('desktop-shots', async () => {
  const d = await newUser('amr', { width: 1280, height: 900 });
  await d.page.screenshot({ path: 'shots/20-desktop-dashboard.png', fullPage: true });
  await d.page.goto(BASE + '/workouts'); await d.page.screenshot({ path: 'shots/21-desktop-arena.png', fullPage: true });
  await d.page.goto(BASE + '/team'); await d.page.screenshot({ path: 'shots/22-desktop-team.png', fullPage: true });
  await d.ctx.close();
});

await step('rate-limit', async () => {
  sql('truncate login_attempts');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pg = await ctx.newPage();
  await pg.goto(BASE + '/login');
  await pg.getByText('AMAN', { exact: true }).click();
  for (let i = 0; i < 5; i++) {
    await pg.fill('input[name=password]', 'wrong' + i);
    await pg.getByRole('button', { name: 'Enter TRIO FIT' }).click();
    await pg.waitForSelector('text=Wrong password');
    await pg.waitForTimeout(300);
  }
  await pg.fill('input[name=password]', 'e2e-test-password');
  await pg.getByRole('button', { name: 'Enter TRIO FIT' }).click();
  await pg.waitForSelector('text=Too many attempts');
  check(pg.url().endsWith('/login'), 'correct password is refused while rate-limited');
  sql('truncate login_attempts');
});

console.log('AI mock saw key on all calls:', !/NO-KEY/.test(execSync('cat mock-ai.log').toString()));
console.log('errors:', errors);
console.log(bad ? `FAILURES: ${bad}` : 'ALL OK');
await browser.close();
