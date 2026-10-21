import { useMemo, useState } from 'react';
import { useExerciseDocs } from '../../library/useExerciseDocs';
import { useLogs } from '../../logging/useLogs';
import { useReports } from '../../inbody/useReports';
import { useWeights } from '../../body/useWeights';
import { useUnits, byDate, shortDate, weekStart, r1 } from '@forge/shared';
import { ChartCard, COLORS } from '@forge/ui';
import { IN_METRICS } from '../../inbody/inbody';
import { epley } from '../../progress/prs';

export default function Charts() {
  const { show, unit } = useUnits();
  const weights = useWeights().items;
  const logs = useLogs().items;
  const exercises = useExerciseDocs().items;
  const inbody = useReports().items;
  const [metric, setMetric] = useState('weight');

  const options = [
    { id: 'weight', label: 'Body weight' },
    ...IN_METRICS.filter((m) => m.key !== 'weight').map((m) => ({ id: 'ib:' + m.key, label: 'InBody · ' + m.label })),
    { id: 'days', label: 'Gym days per week' },
    { id: 'volume', label: `Training volume per week (${unit})` },
    ...exercises.map((e) => ({ id: 'ex:' + e.id, label: 'Lift · ' + e.name + ' (top weight)' })),
    ...exercises.map((e) => ({ id: 'rm:' + e.id, label: 'Lift · ' + e.name + ' (est. 1RM)' })),
  ];

  const chart = useMemo(() => {
    if (metric === 'weight') {
      return { name: `Weight (${unit})`, color: COLORS.ember, data: [...weights].sort(byDate).map((w) => ({ label: shortDate(w.date), v: show(w.value) })), zoom: true };
    }
    if (metric.startsWith('ib:')) {
      const m = IN_METRICS.find((x) => x.key === metric.slice(3));
      return { name: m.label, color: COLORS.volt, zoom: true, data: [...inbody].sort(byDate).filter((r) => r[m.key] != null).map((r) => ({ label: shortDate(r.date), v: m.kind === 'mass' ? show(r[m.key]) : r[m.key] })) };
    }
    if (metric === 'days' || metric === 'volume') {
      const byWeek = {};
      logs.forEach((l) => {
        const w = weekStart(l.date);
        byWeek[w] = byWeek[w] || { days: new Set(), vol: 0 };
        byWeek[w].days.add(l.date);
        byWeek[w].vol += l.weight * l.reps * l.sets;
      });
      const keys = Object.keys(byWeek).sort();
      return metric === 'days'
        ? { name: 'Gym days', color: COLORS.gold, zoom: false, data: keys.map((k) => ({ label: 'Wk ' + shortDate(k), v: byWeek[k].days.size })) }
        : { name: `Volume (${unit})`, color: COLORS.gold, zoom: false, data: keys.map((k) => ({ label: 'Wk ' + shortDate(k), v: Math.round(Number(show(byWeek[k].vol))) })) };
    }
    const [kind, id] = metric.split(':');
    const mine = logs.filter((l) => l.exerciseId === id);
    const perDay = {};
    mine.forEach((l) => {
      const val = kind === 'rm' ? epley(l.weight, l.reps) : l.weight;
      perDay[l.date] = Math.max(perDay[l.date] || 0, val);
    });
    return { name: kind === 'rm' ? `Est. 1RM (${unit})` : `Weight (${unit})`, color: COLORS.volt, zoom: true, data: Object.keys(perDay).sort().map((d) => ({ label: shortDate(d), v: r1(Number(show(perDay[d]))) })) };
  }, [metric, weights, logs, inbody, unit]); // eslint-disable-line

  return (
    <div className="page">
      <h1 className="page-title">Charts</h1>
      <section className="panel form">
        <label>What do you want to see?
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      </section>
      <ChartCard key={metric} title={options.find((o) => o.id === metric)?.label || ''} data={chart.data} series={[{ key: 'v', name: chart.name, color: chart.color }]} defaultZoom={chart.zoom} />
    </div>
  );
}
