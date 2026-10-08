import { Bot, Lightbulb } from 'lucide-react';
import { AskCoach, ChallengeSuggestions, GenerateSummary } from '@/components/team/coach-widgets';
import { Notice, PageTitle, SectionTitle, fmt, signed } from '@/components/ui/bits';
import { buildDigest, ruleSummary } from '@/lib/ai/coach';
import { pctChange } from '@/lib/domain/body';
import { aiConfigured } from '@/lib/server/env';
import { listInsights } from '@/lib/server/insights';
import { getMember } from '@/lib/server/members';
import { requireSession } from '@/lib/server/session';

export const metadata = { title: 'AI Coach' };

export default async function Coach() {
  const s = await requireSession();
  const [me, digest, insights] = await Promise.all([getMember(s.memberId), buildDigest(s.memberId), listInsights({ memberId: s.memberId, limit: 12 })]);
  const ai = aiConfigured();
  const lines = ruleSummary(digest, me!.language);
  const summary = insights.find((i) => i.kind === 'summary');
  const feed = insights.filter((i) => i.kind !== 'summary');
  const c = digest.last4Weeks, p = digest.previous4Weeks;
  const rows: [string, number | null, number | null, string][] = [
    ['Workouts', c.sessions, p.sessions, ''], ['Schedule consistency', c.consistencyPct, p.consistencyPct, '%'], ['Training volume', c.totalVolumeKg, p.totalVolumeKg, ' kg'],
    ['Complete food days', c.foodCompleteDays, p.foodCompleteDays, ''], ['Avg calories (logged days)', c.avgCalories, p.avgCalories, ''], ['Water-target days', c.waterTargetDays, p.waterTargetDays, ''],
  ];
  return (
    <div className="space-y-5">
      <PageTitle title="AI Coach" sub="Facts come from your logged data. The AI explains them, it never invents them." />
      {!ai && <Notice tone="orange">AI features are off until <code>ANTHROPIC_API_KEY</code> is set on the server. Everything below still works from your real data.</Notice>}

      <section className="card">
        <SectionTitle right={<GenerateSummary aiReady={ai} />}>Your last 4 weeks</SectionTitle>
        {summary && <p dir="auto" className="mb-3 whitespace-pre-wrap rounded-xl bg-brand-sky/20 p-3 text-sm"><Bot size={14} className="mr-1 inline" />{summary.body}</p>}
        <ul className="list-disc space-y-1 pl-5 text-sm" dir="auto">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm"><thead><tr className="text-left text-xs uppercase muted"><th className="py-1">Metric</th><th>Previous 4 weeks</th><th>Last 4 weeks</th><th>Change</th></tr></thead><tbody>
            {rows.map(([label, cur, prev, unit]) => (
              <tr key={label} className="border-t border-[var(--line)]"><td className="py-2 font-bold">{label}</td><td>{prev == null ? '—' : `${fmt(prev, 0)}${unit}`}</td><td>{cur == null ? '—' : `${fmt(cur, 0)}${unit}`}</td><td className="font-bold">{cur != null && prev != null ? (prev === 0 ? 'new' : signed(pctChange(prev, cur), 1, '%')) : '—'}</td></tr>
            ))}</tbody></table>
        </div>
        <p className="mt-2 text-xs muted">Windows: {p.from} → {p.to} vs {c.from} → {c.to}. Days without food logs are unknown, not zero.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card"><SectionTitle>Ask the coach</SectionTitle><AskCoach aiReady={ai} /></section>
        <section className="card"><SectionTitle>Challenges made for you</SectionTitle><ChallengeSuggestions /></section>
      </div>

      <section className="card">
        <SectionTitle><span className="flex items-center gap-2"><Lightbulb size={18} className="text-brand-orange" /> Encouragement feed</span></SectionTitle>
        {feed.length === 0 ? <p className="text-sm muted">Messages appear here after real events: a workout, a record, a comeback, a streak. Log your first workout to get one.</p> : (
          <ul className="space-y-2">{feed.map((i) => <li key={i.id} dir="auto" className="rounded-xl bg-black/[.03] p-3 text-sm dark:bg-white/5">{i.body}{i.source === 'ai' && <span className="ml-2 chip bg-brand-sky/30">AI</span>}</li>)}</ul>
        )}
      </section>
    </div>
  );
}
