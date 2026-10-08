import Link from 'next/link';
import { ArrowLeft, Crown, Medal, Star } from 'lucide-react';
import { Avatar, EmptyState, PageTitle, SectionTitle, fmt } from '@/components/ui/bits';
import { fmtDay, weekStartKey } from '@/lib/domain/time';
import { workoutStreak } from '@/lib/domain/streaks';
import { dayKey } from '@/lib/domain/time';
import { db, must } from '@/lib/server/db';
import { listMembers } from '@/lib/server/members';
import { requireSession } from '@/lib/server/session';
import { timezone } from '@/lib/server/settings';
import { allWorkoutDays } from '@/lib/server/workouts';

export const metadata = { title: 'Hall of Fame' };

export default async function Hall() {
  await requireSession();
  const today = dayKey(new Date(), timezone());
  const [members, days] = await Promise.all([listMembers(), allWorkoutDays()]);
  const rows = must(await db().from('workout_exercises').select('exercises(name, kind), exercise_sets(weight_kg, reps), workout_sessions!inner(member_id, performed_on, status)').eq('workout_sessions.status', 'completed')) as unknown as { exercises: { name: string; kind: string }; exercise_sets: { weight_kg: number | null; reps: number | null }[]; workout_sessions: { member_id: string; performed_on: string } }[];
  const best: Record<string, Record<string, { kg: number; on: string }>> = {};
  for (const r of rows) {
    if (r.exercises.kind !== 'resistance') continue;
    const top = Math.max(0, ...r.exercise_sets.filter((s) => Number(s.reps) > 0).map((s) => Number(s.weight_kg ?? 0)));
    if (top <= 0) continue;
    const m = (best[r.workout_sessions.member_id] ??= {});
    const cur = m[r.exercises.name];
    if (!cur || top > cur.kg) m[r.exercises.name] = { kg: top, on: r.workout_sessions.performed_on };
  }
  const xp = must(await db().from('xp_transactions').select('member_id, amount, occurred_on').gt('amount', 0)) as { member_id: string; amount: number; occurred_on: string }[];
  const weeks: Record<string, number> = {};
  for (const t of xp) { const k = `${t.member_id}|${weekStartKey(t.occurred_on)}`; weeks[k] = (weeks[k] ?? 0) + t.amount; }
  const topWeeks = Object.entries(weeks).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ach = must(await db().from('member_achievements').select('member_id, earned_at, achievements(name, description)').order('earned_at', { ascending: false }).limit(12)) as unknown as { member_id: string; earned_at: string; achievements: { name: string; description: string } }[];
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const empty = rows.length === 0 && xp.length === 0;

  return (
    <div className="space-y-6">
      <PageTitle title="Hall of Fame" sub="Personal bests, strongest weeks and milestones: history that can't be edited away." action={<Link href="/team" className="btn btn-ghost"><ArrowLeft size={16} /> Team</Link>} />
      {empty ? <EmptyState icon={<Medal />} title="The hall is empty (for now)" body="Log workouts and the crew's records, streaks and best weeks get carved in here." /> : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {members.map((m) => {
              const lifts = Object.entries(best[m.id] ?? {}).sort((a, b) => b[1].kg - a[1].kg).slice(0, 5);
              const st = workoutStreak(days.filter((d) => d.member_id === m.id).map((d) => d.performed_on), m.workout_days, today);
              return (
                <div key={m.id} className="card">
                  <div className="flex items-center gap-3"><Avatar member={m} size={48} /><div><div className="font-extrabold">{m.display_name}</div><div className="text-xs muted">Longest streak {st.longest}d · current {st.current}d</div></div></div>
                  <h3 className="mb-1 mt-3 text-sm font-extrabold">Heaviest lifts (personal bests)</h3>
                  {lifts.length === 0 ? <p className="text-sm muted">No lifts logged yet.</p> : <ul className="space-y-1 text-sm">{lifts.map(([n, v]) => <li key={n} className="flex justify-between"><span>{n}</span><b>{fmt(v.kg)} kg <span className="font-normal muted">· {fmtDay(v.on)}</span></b></li>)}</ul>}
                </div>
              );
            })}
          </section>
          <section className="card">
            <SectionTitle><span className="flex items-center gap-2"><Crown size={18} className="text-brand-orange" /> Strongest weeks (XP)</span></SectionTitle>
            {topWeeks.length === 0 ? <p className="text-sm muted">No XP yet.</p> : <ol className="space-y-2">{topWeeks.map(([k, v], i) => { const [mid, wk] = k.split('|'); const m = byId[mid!]; return <li key={k} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-orange text-sm font-extrabold text-white">{i + 1}</span>{m && <Avatar member={m} size={32} />}<span className="flex-1 font-bold">{m?.display_name} <span className="font-normal muted">week of {fmtDay(wk!)}</span></span><b className="text-brand-orange">{v} XP</b></li>; })}</ol>}
            <p className="mt-2 text-xs muted">Raw XP rewards showing up; it is not a strength comparison.</p>
          </section>
          <section className="card">
            <SectionTitle><span className="flex items-center gap-2"><Star size={18} className="text-brand-green" /> Milestones</span></SectionTitle>
            {ach.length === 0 ? <p className="text-sm muted">No achievements unlocked yet.</p> : <ul className="space-y-2 text-sm">{ach.map((a, i) => <li key={i}><b>{byId[a.member_id]?.display_name}</b> unlocked <b>{a.achievements.name}</b> <span className="muted">· {fmtDay(a.earned_at.slice(0, 10))}: {a.achievements.description}</span></li>)}</ul>}
          </section>
        </>
      )}
    </div>
  );
}
