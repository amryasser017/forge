import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowDown, ArrowUp, Minus, Trophy } from 'lucide-react';
import { PageTitle, SectionTitle, Stat, fmt, signed } from '@/components/ui/bits';
import { SessionActions } from '@/components/workouts/session-actions';
import { dayKey, fmtDay } from '@/lib/domain/time';
import { db, must } from '@/lib/server/db';
import { buildSessionReport, type ExerciseReport } from '@/lib/server/reports';
import { requireSession } from '@/lib/server/session';
import { timezone } from '@/lib/server/settings';
import { getSession } from '@/lib/server/workouts';
import type { Metric } from '@/lib/domain/workout';

export const metadata = { title: 'Workout summary' };

function Delta({ m, unit }: { m?: Metric; unit: string }) {
  if (!m) return null;
  const Icon = m.delta > 0 ? ArrowUp : m.delta < 0 ? ArrowDown : Minus;
  const cls = m.delta > 0 ? 'text-emerald-600' : m.delta < 0 ? 'text-red-600' : 'muted';
  return <span className={`inline-flex items-center gap-1 font-bold ${cls}`}><Icon size={14} />{signed(m.delta, 1, ` ${unit}`)}{m.pct != null && <span className="font-semibold"> ({signed(m.pct, 1, '%')})</span>}</span>;
}

function ExerciseCard({ e }: { e: ExerciseReport }) {
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/exercises/${e.slug}`} className="text-lg font-extrabold hover:text-brand-orange">{e.name}</Link>
        <div className="flex gap-2">
          {e.weightPr && <span className="chip bg-brand-orange text-white"><Trophy size={12} /> Weight PR</span>}
          {e.volumePr && !e.weightPr && <span className="chip bg-brand-green/40">Volume PR</span>}
          {e.baseline && <span className="chip bg-brand-sky/30">Baseline set</span>}
        </div>
      </div>
      {e.kind === 'cardio' ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Duration" value={`${fmt(e.cardioCurrent?.durationMin)} min`} sub={e.cardio && e.cardio.comparable ? <Delta m={e.cardio.duration} unit="min" /> : 'No earlier session'} />
          <Stat label="Distance" value={`${fmt(e.cardioCurrent?.distanceKm, 2)} km`} sub={e.cardio && e.cardio.comparable ? <Delta m={e.cardio.distance} unit="km" /> : undefined} />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <thead><tr className="text-left text-xs uppercase muted"><th className="py-1">Set</th><th>Now</th><th>Last time{e.previous ? ` (${fmtDay(e.previous.performedOn)})` : ''}</th></tr></thead>
              <tbody>
                {(e.comparison?.setBySet ?? e.sets.map((s, i) => ({ set: i + 1, cur: { weightKg: s.weight_kg, reps: s.reps }, prev: null }))).map((r) => (
                  <tr key={r.set} className="border-t border-[var(--line)]"><td className="py-2 font-bold">{r.set}</td><td className="font-extrabold">{r.cur.weightKg ?? '–'} kg × {r.cur.reps ?? '–'}</td><td className="muted">{r.prev ? `${r.prev.weightKg ?? '–'} kg × ${r.prev.reps ?? '–'}` : '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {e.comparison?.comparable ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-black/[.03] p-2 dark:bg-white/5"><dt className="text-xs muted">Top weight</dt><dd>{e.comparison.weight?.previous} → <b>{e.comparison.weight?.current} kg</b> <Delta m={e.comparison.weight} unit="kg" /></dd></div>
              <div className="rounded-xl bg-black/[.03] p-2 dark:bg-white/5"><dt className="text-xs muted">Total reps</dt><dd>{e.comparison.reps?.previous} → <b>{e.comparison.reps?.current}</b> <Delta m={e.comparison.reps} unit="" /></dd></div>
              <div className="rounded-xl bg-black/[.03] p-2 dark:bg-white/5"><dt className="text-xs muted">Volume (kg × reps)</dt><dd>{fmt(e.comparison.volume?.previous, 0)} → <b>{fmt(e.comparison.volume?.current, 0)}</b> <Delta m={e.comparison.volume} unit="kg" /></dd></div>
            </dl>
          ) : <p className="text-sm muted">No earlier session of this exercise to compare with yet. Today is your baseline.</p>}
        </>
      )}
    </section>
  );
}

export default async function WorkoutSummary({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;
  const session = await getSession(id);
  if (!session || session.member_id !== s.memberId) notFound();
  const report = await buildSessionReport(s.memberId, session);
  const xpRows = must(await db().from('xp_transactions').select('amount, reason').eq('ref_id', id).in('ref_type', ['workout', 'pr'])) as { amount: number; reason: string }[];
  const { data: insight } = await db().from('ai_insights').select('body, source').eq('event_key', `insight:workout:${id}`).maybeSingle();
  const xp = xpRows.reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-5">
      <PageTitle title={session.title} sub={`${fmtDay(session.performed_on, { weekday: 'long', day: 'numeric', month: 'long' })}${session.duration_min ? ` · ${session.duration_min} min` : ''}${session.perceived_effort ? ` · effort ${session.perceived_effort}/10` : ''}`} action={<SessionActions id={id} today={dayKey(new Date(), timezone())} />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="XP earned" value={`+${xp}`} tone="orange" sub="from this session" />
        <Stat label="Total volume" value={`${report.totalVolume.toLocaleString()} kg`} sub={report.volumePct != null ? `${signed(report.volumePct, 1, '%')} vs last time` : 'baseline'} tone="sky" />
        <Stat label="Exercises" value={report.exercises.length} />
        <Stat label="Personal records" value={report.prNames.length} tone="green" sub={report.prNames.join(', ') || 'none this time'} />
      </div>
      {insight && <p dir="auto" className="card border-brand-orange/40 bg-brand-orange/5 text-sm font-semibold">{insight.body as string}{insight.source === 'ai' && <span className="ml-2 chip bg-brand-sky/30">AI</span>}</p>}
      <SectionTitle>Exercise by exercise</SectionTitle>
      <div className="space-y-4">{report.exercises.map((e) => <ExerciseCard key={e.workoutExerciseId} e={e} />)}</div>
      {session.notes && <p className="card text-sm"><b>Notes:</b> {session.notes}</p>}
    </div>
  );
}
