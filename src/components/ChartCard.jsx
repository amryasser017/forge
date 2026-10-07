import { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

/** Bar/line chart with a type switch and a "zoom" toggle so small changes are visible. */
export default function ChartCard({ title, subtitle, data, series, defaultType = 'bar', defaultZoom = false, extra }) {
  const [type, setType] = useState(defaultType);
  const [zoom, setZoom] = useState(defaultZoom);
  const Chart = type === 'bar' ? BarChart : LineChart;
  const domain = zoom
    ? [(min) => Math.floor(min * 0.94), (max) => Math.ceil(max * 1.03)]
    : [0, 'auto'];

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <div className="seg-row">
          {extra}
          <button className={'seg' + (zoom ? ' on' : '')} onClick={() => setZoom(!zoom)}>Zoom</button>
          <div className="seg-group">
            <button className={'seg' + (type === 'bar' ? ' on' : '')} onClick={() => setType('bar')}>Bars</button>
            <button className={'seg' + (type === 'line' ? ' on' : '')} onClick={() => setType('line')}>Line</button>
          </div>
        </div>
      </header>
      {!data.length ? (
        <div className="empty">No data yet. Add an entry and the chart will appear here.</div>
      ) : (
        <ResponsiveContainer width="100%" height={270}>
          <Chart data={data} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="#2A3447" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#8D97AB', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8D97AB', fontSize: 12 }} axisLine={false} tickLine={false} domain={domain} allowDecimals />
            <Tooltip
              contentStyle={{ background: '#1E2636', border: '1px solid #2A3447', borderRadius: 10, color: '#F2F0EA' }}
              cursor={{ fill: 'rgba(255,255,255,.05)' }}
            />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: '#8D97AB' }} />}
            {series.map((s) =>
              type === 'bar' ? (
                <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={46} />
              ) : (
                <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={3}
                  dot={{ r: 4, fill: s.color, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              )
            )}
          </Chart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
