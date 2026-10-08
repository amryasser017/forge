import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(__dirname, '..', 'supabase', 'migrations');
const AMR = '00000000-0000-4000-8000-000000000001';
const AMAN = '00000000-0000-4000-8000-000000000002';

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(join(dir, f), 'utf8'));
});

const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => ((await db.query<T>(sql, params)).rows[0] as T);

describe('migrations and seed', () => {
  it('seeds exactly the three members', async () => {
    const r = await db.query<{ slug: string }>('select slug from members order by slug');
    expect(r.rows.map((x) => x.slug)).toEqual(['aman', 'amr', 'shady']);
  });
  it('seed is idempotent (re-running creates no duplicates)', async () => {
    await db.exec(readFileSync(join(dir, '0003_seed.sql'), 'utf8'));
    expect((await one<{ n: number }>('select count(*)::int n from members')).n).toBe(3);
    expect((await one<{ n: number }>('select count(*)::int n from exercises')).n).toBe(36);
  });
  it('seeds no fake personal data', async () => {
    for (const t of ['body_measurements', 'workout_sessions', 'food_logs', 'xp_transactions', 'member_achievements']) {
      expect((await one<{ n: number }>(`select count(*)::int n from ${t}`)).n).toBe(0);
    }
  });
  it('never seeds a made-up video URL', async () => {
    expect((await one<{ n: number }>('select count(*)::int n from exercises where youtube_url is not null or youtube_video_id is not null')).n).toBe(0);
  });
  it('enables row level security on every table', async () => {
    const r = await db.query<{ tablename: string }>(`select c.relname as tablename from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    expect(r.rows).toEqual([]);
  });
});

describe('idempotent rewards', () => {
  it('pays an event key only once', async () => {
    const a = await one<{ award_xp: boolean }>(`select award_xp($1, 'workout:test:1', 100, 10, 'Workout') as award_xp`, [AMR]);
    const b = await one<{ award_xp: boolean }>(`select award_xp($1, 'workout:test:1', 100, 10, 'Workout') as award_xp`, [AMR]);
    expect(a.award_xp).toBe(true);
    expect(b.award_xp).toBe(false);
    expect((await one<{ xp_total: number }>('select xp_total from member_totals where member_id = $1', [AMR])).xp_total).toBe(100);
  });
  it('rejects negative XP amounts at the database level', async () => {
    await expect(db.query(`insert into xp_transactions (member_id, event_key, amount, reason) values ($1, 'neg', -5, 'x')`, [AMR])).rejects.toThrow();
    expect((await one<{ award_xp: boolean }>(`select award_xp($1, 'neg2', -50, 0, 'x') as award_xp`, [AMR])).award_xp).toBe(true);
    expect((await one<{ xp_total: number }>('select xp_total from member_totals where member_id = $1', [AMR])).xp_total).toBe(100);
  });
  it('keeps each member total separate', async () => {
    await db.query(`select award_xp($1, 'workout:test:2', 100, 0, 'Workout')`, [AMAN]);
    expect((await one<{ xp_total: number }>('select xp_total from member_totals where member_id = $1', [AMAN])).xp_total).toBe(100);
    expect((await one<{ xp_total: number }>('select xp_total from member_totals where member_id = $1', [AMR])).xp_total).toBe(100);
  });
  it('grants an achievement once and pays its reward once', async () => {
    const first = await one<{ grant_achievement: boolean }>(`select grant_achievement($1, 'first-workout') as grant_achievement`, [AMR]);
    const again = await one<{ grant_achievement: boolean }>(`select grant_achievement($1, 'first-workout') as grant_achievement`, [AMR]);
    expect(first.grant_achievement).toBe(true);
    expect(again.grant_achievement).toBe(false);
    expect((await one<{ n: number }>(`select count(*)::int n from xp_transactions where event_key like 'achievement:%' and member_id = $1`, [AMR])).n).toBe(1);
    expect((await one<{ grant_achievement: boolean }>(`select grant_achievement($1, 'does-not-exist') as grant_achievement`, [AMR])).grant_achievement).toBe(false);
  });
});

describe('cosmetics shop', () => {
  it('blocks purchases without enough coins, then sells once', async () => {
    const item = await one<{ id: string }>(`select id from cosmetic_items where key = 'frame-orange'`);
    expect((await one<{ buy_cosmetic: string }>('select buy_cosmetic($1, $2) as buy_cosmetic', [AMAN, item.id])).buy_cosmetic).toBe('insufficient');
    await db.query(`select award_xp($1, 'coins:test', 0, 100, 'bonus')`, [AMAN]);
    expect((await one<{ buy_cosmetic: string }>('select buy_cosmetic($1, $2) as buy_cosmetic', [AMAN, item.id])).buy_cosmetic).toBe('ok');
    expect((await one<{ buy_cosmetic: string }>('select buy_cosmetic($1, $2) as buy_cosmetic', [AMAN, item.id])).buy_cosmetic).toBe('owned');
    expect((await one<{ coins_total: number }>('select coins_total from member_totals where member_id = $1', [AMAN])).coins_total).toBe(40);
  });
});

describe('data constraints', () => {
  it('rejects impossible measurements', async () => {
    await expect(db.query(`insert into body_measurements (member_id, measured_on, body_fat_pct) values ($1, '2026-10-01', 150)`, [AMR])).rejects.toThrow();
  });
  it('de-duplicates challenge progress events', async () => {
    const c = await one<{ id: string }>(`insert into challenges (scope, title, metric, target, starts_on, ends_on) values ('team','T','workout_sessions',5,'2026-10-04','2026-10-10') returning id`);
    await db.query(`insert into challenge_events (challenge_id, member_id, day, event_key) values ($1,$2,'2026-10-05','k1')`, [c.id, AMR]);
    await expect(db.query(`insert into challenge_events (challenge_id, member_id, day, event_key) values ($1,$2,'2026-10-05','k1')`, [c.id, AMR])).rejects.toThrow();
  });
  it('deleting a session cascades its exercises and sets', async () => {
    const ex = await one<{ id: string }>(`select id from exercises where slug = 'leg-press'`);
    const s = await one<{ id: string }>(`insert into workout_sessions (member_id, performed_on, title) values ($1,'2026-10-05','Legs') returning id`, [AMR]);
    const we = await one<{ id: string }>(`insert into workout_exercises (session_id, exercise_id) values ($1,$2) returning id`, [s.id, ex.id]);
    await db.query(`insert into exercise_sets (workout_exercise_id, set_no, weight_kg, reps) values ($1,1,80,12)`, [we.id]);
    await db.query('delete from workout_sessions where id = $1', [s.id]);
    expect((await one<{ n: number }>('select count(*)::int n from exercise_sets')).n).toBe(0);
  });
});
