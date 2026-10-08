'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, ReferenceLine } from 'recharts';

export interface Point {
  label: string;
  value: number | null;
}

export function TrendChart({ data, unit, color = '#F28C28', height = 180, target }: { data: Point[]; unit?: string; color?: string; height?: number; target?: number | null }) {
  const pts = data.filter((d) => d.value != null);
  if (pts.length < 2) return <p className="rounded-xl bg-black/[.03] p-4 text-center text-sm muted dark:bg-white/5">Log at least two entries to see a trend.</p>;
  return (
    <div style={{ height }} role="img" aria-label={`Trend chart${unit ? ` in ${unit}` : ''}`}>
      <ResponsiveContainer>
        <LineChart data={pts} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#8886" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
          <Tooltip formatter={(v) => [`${v}${unit ? ` ${unit}` : ''}`, '']} labelStyle={{ fontWeight: 700 }} contentStyle={{ borderRadius: 12 }} />
          {target != null && <ReferenceLine y={target} stroke="#8DDE75" strokeDasharray="5 4" label={{ value: 'target', fontSize: 11, fill: '#5aa844', position: 'insideTopRight' }} />}
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, unit, color = '#83D3F5', height = 160, target }: { data: Point[]; unit?: string; color?: string; height?: number; target?: number | null }) {
  return (
    <div style={{ height }} role="img" aria-label={`Bar chart${unit ? ` in ${unit}` : ''}`}>
      <ResponsiveContainer>
        <BarChart data={data.map((d) => ({ ...d, value: d.value ?? 0 }))} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#8886" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
          <Tooltip formatter={(v) => [`${v}${unit ? ` ${unit}` : ''}`, '']} contentStyle={{ borderRadius: 12 }} cursor={{ fill: '#8882' }} />
          {target != null && <ReferenceLine y={target} stroke="#F28C28" strokeDasharray="5 4" />}
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
