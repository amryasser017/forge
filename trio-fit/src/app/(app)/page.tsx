import Link from 'next/link';
import { Dumbbell, Flame, Salad, Sparkles, Swords, Trophy } from 'lucide-react';
import { Avatar, EmptyState, LevelBadge, PageTitle, ProgressBar, SectionTitle, fmt } from '@/components/ui/bits';
import { CheckInForm } from '@/components/checkin-form';
import { WaterTracker } from '@/components/quick-actions';
import { CHALLENGE_METRICS, type ChallengeMetric } from '@/lib/domain/challenges';
import { fmtDay } from '@/lib/domain/time';
import { getDashboard } from '@/lib/server/dashboard';
import { requireSession } from '@/lib/server/session';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard() {
  const s = await requireSession();
  const d = await getDashboard(s.memberId);
  const byId = Object.fromEntries(d.cards.map((c) => [c.member.id, c.member]));
  const me = d.cards.find((c) => c.member.id === s.memberId)!;
  const board = [...d.cards].sort((a, b) => b.weekXp - a.weekXp);
  const lastInsight = d.insights.find((i) => i.member_id === s.memberId && i.kind !== 'summary');
  const teamWeekDone = d.cards.reduce((a, c) => a + c.week.completed, 0);
  const teamWeekPlanned = d.cards.reduce((a, c) => a + c.week.planned, 0);

  return (
    <div className="space-y-6">
      <PageTitle title={`Let's go, ${me.member.display_name}!`} sub={fmtDay(d.today, { weekday: 'long', day: 'numeric', month: 'long' })} />

      <section className="card border-brand-orange/40 bg-gradient-to-br from-brand-orange/10 to-brand-sky/15">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold muted">Today</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/workouts/new" className="btn btn-primary"><Dumbbell size={18} /> {me.trainedToday ? 'Log another workout' : 'Start today\'s workout'}</Link>
              <Link href="/kitchen" className="btn btn-green"><Salad size={18} /> Log food</Link>
              <Link href="/coach" className="btn btn-sky"><Sparkles size={18} /> Ask the coach</Link>
            </div>
          </div>
          <div className="min-w-[220px]"><LevelBadge level={me.totals.level} /></div>
        </div>
        {lastInsight && <p dir="auto" className="mt-4 rounded-xl bg-white/70 p-3 text-sm font-semibold text-brand-navy dark:bg-white/10 dark:text-[var(--ink)]">{lastInsight.body}</p>}
      </section>

      <section aria-labelledby="crew">
        <SectionTitle right={<span className="chip bg-brand-green/30">Team week: {teamWeekDone}/{teamWeekPlanned} planned sessions</span>}><span id="crew">The Trio</span></SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {d.cards.map((c) => {
            const visible = c.member.share_body_stats || c.member.id === s.memberId;
            return (
              <Link key={c.member.id} href={`/members/${c.member.slug}`} className="card block transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center gap-3">
                  <Avatar member={c.member} size={64} frame={c.frame} />
                  <div className="min-w-0">
                    <div className="text-lg font-extrabold">{c.member.display_name}</div>
                    <div className="truncate text-xs font-bold text-brand-orange">{c.title ?? c.totals.level.title}</div>
                  </div>
                </div>
                <div className="mt-3"><LevelBadge level={c.totals.level} /></div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-black/[.03] py-2 dark:bg-white/5"><dt className="muted">Weight</dt><dd className="text-base font-extrabold">{visible ? (c.weight ? `${fmt(c.weight.weight_kg)} kg` : '—') : 'private'}</dd></div>
                  <div className="rounded-xl bg-black/[.03] py-2 dark:bg-white/5"><dt className="muted">Body fat</dt><dd className="text-base font-extrabold">{visible ? (c.fat ? `${fmt(c.fat.body_fat_pct)}%` : '—') : 'private'}</dd></div>
                  <div className="rounded-xl bg-black/[.03] py-2 dark:bg-white/5"><dt className="muted">Streak</dt><dd className="flex items-center justify-center gap-1 text-base font-extrabold"><Flame size={14} className="text-brand-orange" />{c.streak.current}</dd></div>
                </dl>
                <div className="mt-3">
                  <div className="flex justify-between text-xs font-bold"><span>This week</span><span>{c.week.completed}/{c.week.planned || '–'} planned{c.week.extra ? ` +${c.week.extra}` : ''}</span></div>
                  <div className="mt-1"><ProgressBar value={c.week.planned ? (c.week.completed / c.week.planned) * 100 : 0} color="bg-brand-green" label="Weekly sessions" /></div>
                </div>
                <div className="mt-2 flex justify-between text-xs muted"><span>Logging streak: {c.logging}d</span><span>{c.weekXp} XP this week</span></div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <SectionTitle right={<Link href="/team" className="text-sm font-bold text-brand-orange">Full board</Link>}>Weekly XP</SectionTitle>
          <ol className="space-y-2">
            {board.map((c, i) => (
              <li key={c.member.id} className="flex items-center gap-3 rounded-xl bg-black/[.03] p-2 dark:bg-white/5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-orange text-sm font-extrabold text-white">{c.weekXp > 0 ? i + 1 : '–'}</span>
                <Avatar member={c.member} size={36} frame={c.frame} />
                <span className="flex-1 font-extrabold">{c.member.display_name}</span>
                <span className="font-extrabold text-brand-orange">{c.weekXp} XP</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs muted">Ranking resets every Sunday. Deeper boards compare each of you against your own progress.</p>
        </section>

        <section className="card">
          <SectionTitle right={<Link href="/team" className="text-sm font-bold text-brand-orange">All challenges</Link>}>Active challenges</SectionTitle>
          {d.challenges.length === 0 ? (
            <EmptyState icon={<Swords />} title="No active challenge" body="Create this week's challenges (a team boss battle included) from the Team page." action={<Link href="/team" className="btn btn-primary">Open Team</Link>} />
          ) : (
            <ul className="space-y-3">
              {d.challenges.map((c) => (
                <li key={c.id}>
                  <div className="flex justify-between text-sm font-bold"><span>{c.is_boss ? '👹 ' : ''}{c.title}</span><span className="muted">{c.scope === 'team' ? c.total : (c.progress[s.memberId] ?? 0)}/{c.target} {CHALLENGE_METRICS[c.metric as ChallengeMetric]?.unit}</span></div>
                  <div className="mt-1"><ProgressBar value={c.pct} color={c.is_boss ? 'bg-brand-orange' : 'bg-brand-green'} label={c.title} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <SectionTitle>Recent records</SectionTitle>
          {d.prs.length === 0 ? <p className="text-sm muted">No personal records yet. Your first session sets the baseline; beat it next time.</p> : (
            <ul className="space-y-2 text-sm">{d.prs.map((p, i) => <li key={i} className="flex items-center gap-2"><Trophy size={16} className="text-brand-orange" /><b>{byId[p.member_id]?.display_name}</b> <span className="muted">{p.reason.replace('Personal record: ', '')} · {fmtDay(p.occurred_on)}</span></li>)}</ul>
          )}
          <h3 className="mb-2 mt-4 text-sm font-extrabold">Achievements</h3>
          {d.achievements.length === 0 ? <p className="text-sm muted">Nothing unlocked yet. Your first workout unlocks one.</p> : (
            <ul className="flex flex-wrap gap-2">{d.achievements.map((a, i) => <li key={i} className="chip bg-brand-green/30"><Trophy size={12} /> {byId[a.member_id]?.display_name}: {a.name}</li>)}</ul>
          )}
        </section>

        <section className="card">
          <SectionTitle>Water today</SectionTitle>
          <WaterTracker day={d.today} consumed={d.me.water} goal={d.me.goals.water_target_ml} />
          <h3 className="mb-2 mt-5 text-sm font-extrabold">Daily check-in</h3>
          <CheckInForm day={d.today} existing={d.me.checkIn} />
        </section>
      </div>
    </div>
  );
}
