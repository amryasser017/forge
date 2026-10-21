import { useState } from 'react';
import { Star } from 'lucide-react';
import { useApp } from '../../AppContext';
import { ensureLibExercise } from '../exerciseData';

/** Star toggle. For a library exercise that has no doc yet, the doc is created first. */
export default function FavoriteButton({ doc, libEx }) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const on = !!doc?.favorite;
  async function toggle() {
    setBusy(true);
    try {
      if (!doc && libEx) await ensureLibExercise(app, libEx);
      const id = doc?.id ?? `lib_${libEx.id}`;
      await app.merge('exercises', id, { favorite: !on });
    } finally { setBusy(false); }
  }
  return (
    <button type="button" className={'icon-btn fav' + (on ? ' on' : '')} disabled={busy} onClick={toggle} aria-pressed={on} aria-label={on ? 'Remove from favorites' : 'Add to favorites'} title={on ? 'Remove from favorites' : 'Add to favorites'}>
      <Star size={20} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}
