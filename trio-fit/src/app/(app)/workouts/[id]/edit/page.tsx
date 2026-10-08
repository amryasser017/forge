import { notFound } from 'next/navigation';
import { PageTitle } from '@/components/ui/bits';
import { WorkoutLogger } from '@/components/workouts/logger';
import { getSession, listExercises, toWorkoutInput } from '@/lib/server/workouts';
import { requireSession } from '@/lib/server/session';

export const metadata = { title: 'Edit workout' };

export default async function EditWorkout({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;
  const session = await getSession(id);
  if (!session || session.member_id !== s.memberId) notFound();
  const exs = await listExercises();
  const library = exs.map((e) => ({ id: e.id, slug: e.slug, name: e.name, kind: e.kind, categories: e.categories ?? [], equipment: e.equipment }));
  const input = toWorkoutInput(session, session.performed_on);
  return (
    <div>
      <PageTitle title="Edit workout" sub="Rewards are never paid twice for the same workout." />
      <WorkoutLogger library={library} initial={{ ...input, id: session.id }} />
    </div>
  );
}
