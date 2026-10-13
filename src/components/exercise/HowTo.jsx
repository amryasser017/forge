import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import videos from '../../data/videos.json';
import { exerciseSummary } from '../../lib/exerciseSummary';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
export const howToUrl = (name) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} proper form`)}`;

/** Embedded player only when src/data/videos.json has an id for this exercise; otherwise a search link. */
export function VideoBlock({ ex }) {
  const id = videos[ex.id];
  const [playing, setPlaying] = useState(false);
  if (typeof id === 'string' && VIDEO_ID.test(id)) {
    return playing ? (
      <div className="video"><iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`} title={`${ex.name} how-to`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>
    ) : (
      <button type="button" className="video facade" onClick={() => setPlaying(true)} aria-label={`Play ${ex.name} how-to video`}>
        <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" /><span className="play"><Play size={28} /></span>
      </button>
    );
  }
  return <a className="btn ghost" href={howToUrl(ex.name)} target="_blank" rel="noopener noreferrer"><Play size={16} /> Watch how-to <ExternalLink size={14} /></a>;
}

/** One-line summary, numbered steps from the dataset and the how-to video / link. */
export default function HowTo({ ex }) {
  const summary = exerciseSummary(ex);
  const steps = ex.instructions || [];
  return (
    <div className="howto">
      {summary && <p className="summary">{summary}</p>}
      {steps.length > 0 ? (
        <ol className="steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      ) : <p className="muted">No written steps for this exercise.</p>}
      <VideoBlock ex={ex} />
    </div>
  );
}
