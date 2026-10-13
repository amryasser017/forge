import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { imageUrls } from '../../lib/exerciseData';

/** Lazy exercise image: skeleton while loading, CDN -> raw GitHub fallback, then a placeholder. */
export default function ExerciseImage({ ex, index = 0, alt = '', className = '' }) {
  const urls = imageUrls(ex, index);
  const [stage, setStage] = useState(0); // which url we are trying
  const [loaded, setLoaded] = useState(false);
  const failed = stage >= urls.length;
  return (
    <span className={`ex-img ${className}`}>
      {!loaded && !failed && <span className="skeleton" aria-hidden />}
      {failed ? (
        <span className="ex-img-empty" role="img" aria-label={alt || 'No image'}><ImageOff size={20} /></span>
      ) : (
        <img
          key={urls[stage]}
          src={urls[stage]}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => { setLoaded(false); setStage((s) => s + 1); }}
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </span>
  );
}
