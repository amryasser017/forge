import { ArrowDown, ArrowRight, ArrowUp, Trophy } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../../AppContext';
import { bestWeight, lastSets, sessionsOf, trendOf } from '../../lib/exerciseStats';
import { COLORS, computePRs, fmtDate, shortDate } from '../../utils';

export function TrendArrow({ trend }) {
  if (!trend) return null;
  const Icon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : ArrowRight;
  const cls = trend === 'up' ? 'up' : trend === 'down' ? 'down' : 'muted';
  const label = trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'Holding steady';
  return <span className={`trend ${cls}`} role="img" aria-label={label} title={label}><Icon size={16} /></span>;
}

/** Best weight, a compact chart of the last ~8 sessions, PR badges and the last 5 sets. `logs` = this exercise only. */
export default function ProgressPanel({ logs }) {
  const { show, unit } = useApp();
  if (logs.length === 0) return <div className="empty">No sets yet. Your first one sets the baseline.</div>;
  const prIds = computePRs(logs);
  const sessions = sessionsOf(logs).slice(-8);
  const data = sessions.map((s) => ({ label: shortDate(s.date), weight: Number(show(s.top)) }));
  const best = bestWeight(logs);
  const trend = trendOf(logs);
  return (
    <div className="progress">
      <div className="progress-top">
        <div><small className="muted">Best weight</small><b className="big-num">{show(best)}<em>{unit}</em></b></div>
        <div className="progress-badges">
          <TrendArrow trend={trend} />
          {prIds.size > 0 && <span className="chip gold-chip"><Trophy size={12} /> {prIds.size} PR{prIds.size === 1 ? '' : 's'}</span>}
        </div>
      </div>
      {data.length > 1 ? (
        <div className="mini-chart" role="img" aria-label={`Top weight over your last ${data.length} sessions`}>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#2a3447" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8d97ab', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: '#8d97ab', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
              <Tooltip contentStyle={{ background: '#171d29', border: '1px solid #2a3447', borderRadius: 10 }} formatter={(v) => [`${v} ${unit}`, 'Top weight']} />
              <Line type="monotone" dataKey="weight" stroke={COLORS.volt} strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <p className="muted">Log one more session to see your trend.</p>}
      <h4 className="mini-title">Last sets</h4>
      <ul className="rows compact">
        {lastSets(logs, 5).map((l) => (
          <li key={l.id}>
            <div><b>{show(l.weight)} {unit} × {l.reps}{l.sets > 1 ? ` × ${l.sets} sets` : ''} {prIds.has(l.id) && <span className="chip gold-chip"><Trophy size={12} /> PR</span>}</b><small>{fmtDate(l.date)}</small></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
