import { useApp } from '../AppContext';
import { bestWeight, lastLog, trendOf } from './exerciseStats';
import { TrendArrow } from './ProgressPanel';

/** "Last 60 kg · Best 70 kg ↗" for one exercise's logs. */
export default function Glance({ logs }) {
  const { show, unit } = useApp();
  if (!logs || logs.length === 0) return <small className="muted">No sets yet</small>;
  const last = lastLog(logs);
  return (
    <small className="glance">
      Last {show(last.weight)} {unit} · Best {show(bestWeight(logs))} {unit} <TrendArrow trend={trendOf(logs)} />
    </small>
  );
}
