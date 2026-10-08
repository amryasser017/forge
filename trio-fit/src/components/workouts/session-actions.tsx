'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { deleteWorkoutAction, duplicateWorkoutAction } from '@/app/actions/workouts';
import { useFeedback } from '@/components/ui/feedback';

export function SessionActions({ id, today }: { id: string; today: string }) {
  const { handle } = useFeedback();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/workouts/${id}/edit`} className="btn btn-ghost"><Pencil size={16} /> Edit</Link>
      <button disabled={pending} className="btn btn-ghost" onClick={() => start(async () => handle(await duplicateWorkoutAction(id, today)))}><Copy size={16} /> Duplicate to today</button>
      <button disabled={pending} className="btn btn-danger" onClick={() => { if (window.confirm('Delete this workout? Challenge progress will be recalculated.')) start(async () => handle(await deleteWorkoutAction(id))); }}><Trash2 size={16} /> Delete</button>
    </div>
  );
}
