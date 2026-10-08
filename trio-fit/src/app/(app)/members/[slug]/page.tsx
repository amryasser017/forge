import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Camera, Lock, Trophy } from 'lucide-react';
import { GoalsForm, MeasurementForm, MeasurementHistory, PhotoCard, PhotoUpload } from '@/components/body/forms';
import { Avatar, EmptyState, LevelBadge, SectionTitle, Stat, fmt, signed } from '@/components/ui/bits';
import { TrendChart } from '@/components/ui/charts';
import { bmi, bmiBand, delta, fatFreeMassKg, fatMassKg, pctChange, targetProgress } from '@/lib/domain/body';
import { addDays, dayKey, fmtDay } from '@/lib/domain/time';
import { db, must } from '@/lib/server/db';
import { listMeasurements } from '@/lib/server/measurements';
import { cosmeticsByKey, getGoals, getMemberBySlug, getTotalsFor, memberAchievements } from '@/lib/server/members';
import { requireSession } from '@/lib/server/session';
import { timezone } from '@/lib/server/settings';

const WINDOWS = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['all', 'All time']] as const;

export default async function MemberPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ w?: string }> }) {
  const s = await requireSession();
  const { slug } = await params;
  const member = await getMemberBySlug(slug);
  if (!member) notFound();
  const mine = member.id === s.memberId;
  const canSee = mine || member.share_body_stats;
  const w = (await searchParams).w ?? '30';
  const today = dayKey(new Date(), timezone());
  const [goals, totals, achievements, all, cos] = await Promise.all([getGoals(member.id), getTotalsFor(member.id), memberAchievements(member.id), canSee ? listMeasurements(member.id) : Promise.resolve([]), cosmeticsByKey()]);
  const since = w === 'all' ? '0000-00-00' : addDays(today, -Number(w));
  const inWin = all.filter((m) => m.measured_on >= since);
  const first = all.find((m) => m.weight_kg != null);
  const latest = [...all].reverse().find((m) => m.weight_kg != null);
  const latestFat = [...all].reverse().find((m) => m.body_fat_pct != null);
  const firstFat = all.find((m) => m.body_fat_pct != null);
  const height = goals.height_cm ?? [...all].reverse().find((m) => m.height_cm != null)?.height_cm ?? null;
  const wNow = latest ? Number(latest.weight_kg) : null;
  const series = (pick: (m: (typeof all)[number]) => number | null) => inWin.map((m) => ({ label: fmtDay(m.measured_on), value: pick(m) == null ? null : Number(pick(m)) }));
  const prs = must(await db().from('xp_transactions').select('reason, occurred_on').eq('member_id', member.id).eq('ref_type', 'pr').order('created_at', { ascending: false }).limit(8)) as { reason: string; occurred_on: string }[];

  // photos
  const photoRows = must(await db().from('progress_photos').select('*').eq('member_id', member.id).order('taken_on', { ascending: false }).limit(24)) as { id: string; storage_path: string; taken_on: string; visibility: 'private' | 'shared' }[];
  const visiblePhotos = photoRows.filter((p) => mine || p.visibility === 'shared');
  const photos = await Promise.all(visiblePhotos.map(async (p) => ({ ...p, url: (await db().storage.from('progress-photos').createSignedUrl(p.storage_path, 3600)).data?.signedUrl ?? '' })));
  const progress = targetProgress(goals.start_weight_kg ?? (first ? Number(first.weight_kg) : null), wNow, goals.target_weight_kg);

  return (
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center gap-4">
        <Avatar member={member} size={88} frame={member.equipped_frame ? cos[member.equipped_frame]?.value : null} />
        <div className="min-w-[200px] flex-1">
          <h1 className="text-3xl">{member.display_name}</h1>
          <p className="text-sm font-bold text-brand-orange">{member.equipped_title ? cos[member.equipped_title]?.value : totals.level.title} · {totals.xp.toLocaleString()} XP · {totals.coins} coins</p>
          <div className="mt-2 max-w-sm"><LevelBadge level={totals.level} /></div>
        </div>
        {!mine && <Link href="/team" className="btn btn-ghost">Compare on the board</Link>}
      </section>

      {!canSee ? (
        <EmptyState icon={<Lock />} title="Body stats are private" body={`${member.display_name} chose not to share weight and body measurements with the crew.`} />
      ) : (
        <>
          <section className="card">
            <SectionTitle right={<div className="flex gap-1">{WINDOWS.map(([k, l]) => <Link key={k} href={`?w=${k}`} className={`chip !min-h-[36px] ${w === k ? 'bg-brand-orange text-white' : 'bg-black/5 dark:bg-white/10'}`} scroll={false}>{l}</Link>)}</div>}>Body analytics</SectionTitle>
            {all.length === 0 ? (
              <EmptyState icon={<Camera />} title="No measurements yet" body={mine ? 'Add your weight and height (and body fat or a scan report if you have one). Your trend lines and BMI appear here.' : 'No measurements shared yet.'} />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Stat label="Weight" value={wNow ? `${fmt(wNow)} kg` : '—'} sub={latest ? fmtDay(latest.measured_on) : undefined} tone="orange" />
                  <Stat label="BMI" value={fmt(bmi(wNow, height == null ? null : Number(height)))} sub={height ? bmiBand(bmi(wNow, Number(height))) : 'Add your height'} tone="sky" />
                  <Stat label="Body fat" value={latestFat ? `${fmt(latestFat.body_fat_pct)}%` : '—'} sub={latestFat ? `fat ${fmt(fatMassKg(Number(latestFat.weight_kg ?? wNow), Number(latestFat.body_fat_pct)))} kg · lean ${fmt(fatFreeMassKg(Number(latestFat.weight_kg ?? wNow), Number(latestFat.body_fat_pct)))} kg` : 'Optional'} tone="green" />
                  <Stat label="Target progress" value={progress == null ? '—' : `${Math.round(progress)}%`} sub={goals.target_weight_kg ? `target ${goals.target_weight_kg} kg` : 'Set a target below'} />
                </div>
                <p className="mt-2 text-xs muted">BMI is a rough screening number, not a body-fat measure. Scale and scan readings are estimates; progress matters more than any single value.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div><h3 className="mb-1 text-sm font-extrabold">Weight (kg)</h3><TrendChart data={series((m) => m.weight_kg)} unit="kg" target={goals.target_weight_kg} /></div>
                  <div><h3 className="mb-1 text-sm font-extrabold">Body fat (%)</h3><TrendChart data={series((m) => m.body_fat_pct)} unit="%" color="#8DDE75" target={goals.target_body_fat_pct} /></div>
                  <div><h3 className="mb-1 text-sm font-extrabold">Waist (cm)</h3><TrendChart data={series((m) => m.waist_cm)} unit="cm" color="#83D3F5" /></div>
                </div>
                {first && latest && first.id !== latest.id && (
                  <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[360px] text-sm"><thead><tr className="text-left text-xs uppercase muted"><th className="py-1">First → latest</th><th>First</th><th>Latest</th><th>Change</th></tr></thead><tbody>
                    <tr className="border-t border-[var(--line)]"><td className="py-2 font-bold">Weight (kg)</td><td>{fmt(Number(first.weight_kg))}</td><td>{fmt(wNow)}</td><td className="font-bold">{signed(delta(Number(first.weight_kg), wNow))} ({signed(pctChange(Number(first.weight_kg), wNow), 1, '%')})</td></tr>
                    {firstFat && latestFat && firstFat.id !== latestFat.id && <tr className="border-t border-[var(--line)]"><td className="py-2 font-bold">Body fat (%)</td><td>{fmt(Number(firstFat.body_fat_pct))}</td><td>{fmt(Number(latestFat.body_fat_pct))}</td><td className="font-bold">{signed(delta(Number(firstFat.body_fat_pct), Number(latestFat.body_fat_pct)))} pts</td></tr>}
                  </tbody></table></div>
                )}
              </>
            )}
          </section>

          {mine && (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="card"><SectionTitle>Add measurement</SectionTitle><MeasurementForm today={today} /></section>
              <section className="card"><SectionTitle>My goals &amp; targets</SectionTitle><GoalsForm goals={goals} /></section>
            </div>
          )}
          {mine && all.length > 0 && <section className="card"><SectionTitle>History</SectionTitle><MeasurementHistory rows={[...all].reverse()} today={today} /></section>}
        </>
      )}

      <section className="card">
        <SectionTitle><span className="flex items-center gap-2"><Trophy size={18} className="text-brand-orange" /> Records &amp; achievements</span></SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <div><h3 className="mb-2 text-sm font-extrabold">Personal records</h3>{prs.length === 0 ? <p className="text-sm muted">None yet: beat your own earlier session to set one.</p> : <ul className="space-y-1 text-sm">{prs.map((p, i) => <li key={i}>🏆 {p.reason.replace('Personal record: ', '')} <span className="muted">· {fmtDay(p.occurred_on)}</span></li>)}</ul>}</div>
          <div><h3 className="mb-2 text-sm font-extrabold">Achievements</h3>{achievements.length === 0 ? <p className="text-sm muted">None unlocked yet.</p> : <ul className="flex flex-wrap gap-2">{achievements.map((a) => <li key={a.id} className="chip bg-brand-green/30" title={a.description}>{a.name}</li>)}</ul>}</div>
        </div>
      </section>

      {(mine || photos.length > 0) && (
        <section className="card">
          <SectionTitle>Transformation timeline</SectionTitle>
          {mine && <PhotoUpload today={today} />}
          {photos.length === 0 ? <p className="mt-3 text-sm muted">{mine ? 'Photos are private to you until you choose to share one.' : ''}</p> : <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{photos.map((p) => <PhotoCard key={p.id} id={p.id} url={p.url} takenOn={p.taken_on} visibility={p.visibility} mine={mine} />)}</div>}
        </section>
      )}
    </div>
  );
}
