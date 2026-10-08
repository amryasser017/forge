import { PageTitle } from '@/components/ui/bits';
import { WorkoutLogger } from '@/components/workouts/logger';
import { dayKey } from '@/lib/domain/time';
import { timezone } from '@/lib/server/settings';
import { listExercises } from '@/lib/server/workouts';
import { requireSession } from '@/lib/server/session';

export const metadata = { title: 'New workout' };

export default async function NewWorkout({ searchParams }: { searchParams: Promise<{ exercise?: string }> }) {
  await requireSession();
  const { exercise } = await searchParams;
  const exs = await listExercises();
  const library = exs.map((e) => ({ id: e.id, slug: e.slug, name: e.name, kind: e.kind, categories: e.categories ?? [], equipment: e.equipment }));
  return (
    <div>
      <PageTitle title="New workout" sub="Add exercises, enter your sets, then finish to earn XP." />
      <WorkoutLogger library={library} preselect={exercise} initial={{ performedOn: dayKey(new Date(), timezone()), title: '', exercises: [] }} />
    </div>
  );
}
