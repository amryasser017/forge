import Link from 'next/link';
import { Dumbbell, Plus } from 'lucide-react';
import { EmptyState, PageTitle, SectionTitle } from '@/components/ui/bits';
import { ExerciseLibrary } from '@/components/workouts/library';
import { fmtDay } from '@/lib/domain/time';
import { totalVolume } from '@/lib/domain/workout';
import { listExercises, listSessions } from '@/lib/server/workouts';
import { requireSession } from '@/lib/server/session';

export const metadata = { title: 'Workout Arena' };

export default async function Arena() {
  const s = await requireSession();
  const [exercises, sessions] = await Promise.all([listExercises(), listSessions(s.memberId, { limit: 60 })]);
  const counts: Record<string, number> = {};
  for (const x of sessions) for (const w of x.workout_exercises ?? []) counts[w.exercise_id] = (counts[w.exercise_id] ?? 0) + 1;
  const recent = sessions.slice(0, 6);
  const lib = exercises.map((e) => ({ id: e.id, slug: e.slug, name: e.name, kind: e.kind, categories: e.categories ?? [], equipment: e.equipment, muscles: e.primary_muscles, hasVideo: !!e.youtube_video_id, custom: e.is_custom }));

  return (
    <div className="space-y-6">
      <PageTitle title="Workout Arena" sub="Log sets fast, compare with your last session, beat your own records." action={<Link href="/workouts/new" className="btn btn-primary"><Plus size={18} /> New workout</Link>} />

      <section className="card">
        <SectionTitle>Recent sessions</SectionTitle>
        {recent.length === 0 ? (
          <EmptyState icon={<Dumbbell />} title="No workouts logged yet" body="Pick the machines you used today and enter weight and reps for each set. Your first session becomes the baseline you'll beat next time." action={<Link href="/workouts/new" className="btn btn-primary">Log my first workout</Link>} />
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {recent.map((w) => {
              const vol = (w.workout_exercises ?? []).reduce((a, e) => a + totalVolume(e.exercise_sets.map((x) => ({ weightKg: x.weight_kg == null ? null : Number(x.weight_kg), reps: x.reps }))), 0);
              return (
                <li key={w.id}>
                  <Link href={`/workouts/${w.id}`} className="flex min-h-[56px] items-center justify-between gap-3 py-2 hover:bg-black/[.03] dark:hover:bg-white/5">
                    <div><div className="font-extrabold">{w.title}</div><div className="text-xs muted">{fmtDay(w.performed_on, { weekday: 'short', day: 'numeric', month: 'short' })} · {(w.workout_exercises ?? []).length} exercises</div></div>
                    <div className="text-right text-sm font-bold text-brand-orange">{vol ? `${Math.round(vol).toLocaleString()} kg vol` : 'cardio'}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle>Exercise library</SectionTitle>
        <ExerciseLibrary library={lib} mine={counts} />
      </section>
    </div>
  );
}
