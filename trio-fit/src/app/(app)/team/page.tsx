import Link from 'next/link';
import { Crown, Flame, Skull, Swords, Trophy } from 'lucide-react';
import { ChallengeCreator, WeeklyDefaults } from '@/components/team/challenge-forms';
import { Avatar, EmptyState, PageTitle, ProgressBar, SectionTitle } from '@/components/ui/bits';
import { CHALLENGE_METRICS, type ChallengeMetric } from '@/lib/domain/challenges';
import { BOARDS, type Period } from '@/lib/domain/leaderboard';
import { addDays, dayKey, dayOfWeek, fmtDay, monthStartKey, rangeKeys } from '@/lib/domain/time';
import { listChallenges, type ChallengeView } from '@/lib/server/challenges';
import { computeBoards } from '@/lib/server/leaderboard';
import { requireSession } from '@/lib/server/session';
import { timezone } from '@/lib/server/settings';
import { allWorkoutDays } from '@/lib/server/workouts';

export const metadata = { title: 'Team' };
const PERIODS: [Period, string][] = [['week', 'This week'], ['month', 'This month'], ['all', 'All time']];
const COLORS: Record<string, string> = { amr: 'bg-brand-orange', aman: 'bg-brand-sky', shady: 'bg-brand-green' };

function Challenge({ c, names, me }: { c: ChallengeView; names: Record<string, string>; me: string }) {
  const unit = CHALLENGE_METRICS[c.metric as ChallengeMetric]?.unit ?? '';
  const progress = c.scope === 'team' ? c.total : (c.progress[me] ?? 0);
  return (
    <li className={`rounded-xl border p-3 ${c.is_boss ? 'border-brand-orange bg-brand-orange/5' : 'border-[var(--line)]'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-extrabold">{c.is_boss ? <Skull size={16} className="mr-1 inline text-brand-orange" /> : c.scope === 'battle' ? <Swords size={16} className="mr-1 inline text-brand-orange" /> : null}{c.title}</div>
        <div className="flex gap-1"><span className="chip bg-black/5 dark:bg-white/10">{c.scope}</span><span className="chip bg-brand-orange/15 text-brand-orange">+{c.xp_reward} XP</span></div>
      </div>
      <p className="text-xs muted">{CHALLENGE_METRICS[c.metric as ChallengeMetric]?.label} · {fmtDay(c.starts_on)} → {fmtDay(c.ends_on)} · {c.status}</p>
      {c.scope === 'battle' ? (
        <div className="mt-2 space-y-1">{c.participants.map((p) => <div key={p}><div className="flex justify-between text-sm font-bold"><span>{names[p]}{c.winnerId === p && c.status === 'ended' ? ' 🏆' : ''}</span><span>{c.progress[p] ?? 0} {unit}</span></div><ProgressBar value={Math.min(100, ((c.progress[p] ?? 0) / Math.max(1, c.target)) * 100)} color="bg-brand-orange" label={names[p] ?? ''} /></div>)}<p className="text-xs muted">First to {c.target} {unit}, or most when time is up. Tie = both rewarded.</p></div>
      ) : (
        <div className="mt-2"><div className="flex justify-between text-sm font-bold"><span>{c.scope === 'team' ? 'Together' : 'You'}</span><span>{progress}/{c.target} {unit}</span></div><ProgressBar value={c.pct} color={c.is_boss ? 'bg-brand-orange' : 'bg-brand-green'} label={c.title} />
          {c.scope === 'team' && <p className="mt-1 text-xs muted">{c.participants.map((p) => `${names[p]} ${c.progress[p] ?? 0}`).join(' · ')}</p>}
          {c.complete && <p className="mt-2 rounded-xl bg-brand-green/30 p-2 text-sm font-bold">{c.is_boss ? '👹 Boss defeated! Rewards paid to everyone who contributed.' : '✅ Completed'}</p>}</div>
      )}
    </li>
  );
}

export default async function Team({ searchParams }: { searchParams: Promise<{ p?: string; m?: string }> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const period: Period = sp.p === 'month' || sp.p === 'all' ? sp.p : 'week';
  const today = dayKey(new Date(), timezone());
  const monthKey = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? `${sp.m}-01` : monthStartKey(today);
  const [res, challenges, days] = await Promise.all([computeBoards(period), listChallenges(today), allWorkoutDays()]);
  const names = Object.fromEntries(res.members.map((m) => [m.id, m.display_name]));
  const byId = Object.fromEntries(res.members.map((m) => [m.id, m]));
  const active = challenges.filter((c) => c.status !== 'ended' && (c.scope === 'team' || c.participants.includes(s.memberId)));
  const done = challenges.filter((c) => c.status === 'ended' && (c.scope === 'team' || c.participants.includes(s.memberId))).slice(0, 4);

  // calendar
  const monthEnd = addDays(addDays(monthKey, 32).slice(0, 7) + '-01', -1);
  const grid = rangeKeys(addDays(monthKey, -dayOfWeek(monthKey)), addDays(monthEnd, 6 - dayOfWeek(monthEnd)));
  const prevM = addDays(monthKey, -1).slice(0, 7), nextM = addDays(monthEnd, 1).slice(0, 7);

  return (
    <div className="space-y-6">
      <PageTitle title="Team" sub="Compete with yourself first, then cheer for the crew." action={<Link href="/team/hall" className="btn btn-ghost"><Trophy size={16} /> Hall of Fame</Link>} />

      <section className="card">
        <SectionTitle right={<div className="flex gap-1">{PERIODS.map(([k, l]) => <Link key={k} href={`/team?p=${k}`} className={`chip !min-h-[36px] ${period === k ? 'bg-brand-orange text-white' : 'bg-black/5 dark:bg-white/10'}`}>{l}</Link>)}</div>}>Leaderboards</SectionTitle>
        {res.mvp.length > 0 && <div className="mb-4 flex flex-wrap gap-2">{res.mvp.map((m) => <span key={m.label} className="chip bg-brand-orange/15 text-brand-orange"><Crown size={12} /> {m.label}: {names[m.memberId]} ({m.value})</span>)}</div>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BOARDS.map((b) => (
            <div key={b.key} className="rounded-xl border border-[var(--line)] p-3">
              <h3 className="text-base">{b.title}</h3>
              <ol className="mt-2 space-y-1.5">
                {res.boards[b.key].map((e) => {
                  const m = byId[e.memberId]!;
                  return <li key={e.memberId} className="flex items-center gap-2"><span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-extrabold ${e.rank === 1 ? 'bg-brand-orange text-white' : 'bg-black/10 dark:bg-white/10'}`}>{e.rank ?? '–'}</span><Avatar member={m} size={28} /><span className="flex-1 text-sm font-bold">{m.display_name}</span><span className="text-sm font-extrabold">{e.value == null ? <span className="font-normal muted">no data</span> : `${e.value}${b.unit === 'XP' || b.unit === 'pts' ? ` ${b.unit}` : b.unit}`}</span></li>;
                })}
              </ol>
              <p className="mt-2 text-[11px] leading-snug muted">{b.how}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs muted">Period: {res.window.start === '2000-01-01' ? 'since the beginning' : `${fmtDay(res.window.start)} → ${fmtDay(res.window.end)}`}. No board ranks raw body weight or the heaviest weight: everyone starts from a different place.</p>
      </section>

      <section className="card">
        <SectionTitle right={<div className="flex flex-wrap gap-2"><WeeklyDefaults /><ChallengeCreator today={today} others={res.members.filter((m) => m.id !== s.memberId).map((m) => ({ id: m.id, name: m.display_name }))} /></div>}>Challenges &amp; boss battles</SectionTitle>
        {active.length === 0 ? <EmptyState icon={<Flame />} title="No active challenges" body="Create this week's set in one tap (it includes a team boss), or make your own, or challenge a friend to a battle." /> : <ul className="grid gap-3 md:grid-cols-2">{active.map((c) => <Challenge key={c.id} c={c} names={names} me={s.memberId} />)}</ul>}
        {done.length > 0 && <><h3 className="mb-2 mt-5 text-sm font-extrabold">Recently ended</h3><ul className="grid gap-3 md:grid-cols-2">{done.map((c) => <Challenge key={c.id} c={c} names={names} me={s.memberId} />)}</ul></>}
      </section>

      <section className="card">
        <SectionTitle right={<div className="flex items-center gap-1"><Link href={`/team?m=${prevM}`} className="btn btn-ghost !min-h-[40px]" aria-label="Previous month">‹</Link><Link href={`/team?m=${nextM}`} className="btn btn-ghost !min-h-[40px]" aria-label="Next month">›</Link></div>}>Trio calendar · {fmtDay(monthKey, { month: 'long', year: 'numeric' })}</SectionTitle>
        <div className="mb-2 flex flex-wrap gap-3 text-xs font-bold">{res.members.map((m) => <span key={m.id} className="flex items-center gap-1"><i className={`h-3 w-3 rounded-full ${COLORS[m.slug]}`} />{m.display_name}</span>)}<span className="muted">· dim = rest day</span></div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold muted">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((d) => {
            const inMonth = d.slice(0, 7) === monthKey.slice(0, 7);
            return (
              <div key={d} className={`flex min-h-[52px] flex-col items-center rounded-lg border p-1 ${d === today ? 'border-brand-orange' : 'border-[var(--line)]'} ${inMonth ? '' : 'opacity-30'}`}>
                <span className="text-[11px] font-bold">{Number(d.slice(8))}</span>
                <span className="mt-auto flex gap-0.5">
                  {res.members.map((m) => {
                    const trained = days.some((x) => x.member_id === m.id && x.performed_on === d);
                    const planned = m.workout_days.includes(dayOfWeek(d));
                    return <i key={m.id} title={`${m.display_name}: ${trained ? 'trained' : planned ? (d < today ? 'missed' : 'planned') : 'rest'}`} className={`h-2.5 w-2.5 rounded-full ${trained ? COLORS[m.slug] : planned ? (d < today ? 'bg-red-300/60' : 'bg-black/15 dark:bg-white/20') : 'bg-transparent ring-1 ring-black/10'}`} />;
                  })}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs muted">Filled dot = trained · grey = planned · red = planned but missed · hollow = rest day.</p>
      </section>
    </div>
  );
}
