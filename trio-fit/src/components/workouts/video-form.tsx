'use client';

import { useTransition } from 'react';
import { clearExerciseVideoAction, setExerciseVideoAction } from '@/app/actions/workouts';
import { ActionForm, Field, Submit } from '@/components/ui/action-form';
import { useFeedback } from '@/components/ui/feedback';

export function VideoForm({ exerciseId, hasVideo }: { exerciseId: string; hasVideo: boolean }) {
  const { handle } = useFeedback();
  const [pending, start] = useTransition();
  return (
    <div className="mt-3">
      <ActionForm action={setExerciseVideoAction} resetOnSuccess className="space-y-2">
        <input type="hidden" name="exerciseId" value={exerciseId} />
        <Field label={hasVideo ? 'Replace tutorial video' : 'Add a tutorial video'} name="url" hint="Paste a YouTube link. It is checked with YouTube before it is saved."><input name="url" type="url" placeholder="https://www.youtube.com/watch?v=…" required /></Field>
        <div className="flex gap-2">
          <Submit className="btn btn-sky" pendingText="Verifying…">Verify &amp; save</Submit>
          {hasVideo && <button type="button" disabled={pending} onClick={() => start(async () => handle(await clearExerciseVideoAction(exerciseId)))} className="btn btn-ghost">Remove video</button>}
        </div>
      </ActionForm>
    </div>
  );
}
