import { useRef, useState } from 'react';
import ExerciseImage from './ExerciseImage';

/** Start/end images side by side in a swipeable strip with Start / End buttons. */
export default function ExerciseMedia({ ex }) {
  const n = ex.images?.length || 0;
  const ref = useRef(null);
  const [i, setI] = useState(0);
  if (n === 0) return null;
  const go = (k) => {
    setI(k);
    const el = ref.current;
    if (el) el.scrollTo({ left: el.clientWidth * k, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return (
    <div className="media">
      <div
        className="media-strip"
        ref={ref}
        tabIndex={0}
        aria-label={`${ex.name} images, swipe to see the end position`}
        onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {ex.images.map((_, k) => (
          <div className="media-slide" key={k}><ExerciseImage ex={ex} index={k} alt={`${ex.name}, ${k === 0 ? 'start' : 'end'} position`} /></div>
        ))}
      </div>
      {n > 1 && (
        <div className="media-tabs" role="group" aria-label="Position">
          <button type="button" className={'chip-btn' + (i === 0 ? ' on' : '')} onClick={() => go(0)}>Start</button>
          <button type="button" className={'chip-btn' + (i === 1 ? ' on' : '')} onClick={() => go(1)}>End</button>
        </div>
      )}
    </div>
  );
}
