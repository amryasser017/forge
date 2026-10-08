import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Play, ShieldCheck, Trophy } from 'lucide-react';
import { Avatar, PageTitle, SectionTitle, Stat, fmt, signed } from '@/components/ui/bits';
import { TrendChart } from '@/components/ui/charts';
import { VideoForm } from '@/components/workouts/video-form';
import { fmtDay } from '@/lib/domain/time';
import { embedUrl, searchUrl } from '@/lib/domain/youtube';
import { maxWeight, totalVolume } from '@/lib/domain/workout';
import { pctChange } from '@/lib/domain/body';
import { listMembers } from '@/lib/server/members';
import { requireSession } from '@/lib/server/session';
import { exerciseHistory, exerciseTeamBoard, getExerciseBySlug } from '@/lib/server/workouts';

export default async function ExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await requireSession();
  const { slug } = await params;
  const ex = await getExerciseBySlug(slug);
  if (!ex) notFound();
  const [history, board, members] = await Promise.all([exerciseHistory(s.memberId, ex.id, { limit: 40 }), exerciseTeamBoard(ex.id), listMembers()]);
  const chrono = [...history].reverse();
  const cardio = ex.kind === 'cardio';
  const toSets = (x: (typeof history)[number]) => x.sets.map((v) => ({ weightKg: v.weight_kg == null ? null : Number(v.weight_kg), reps: v.reps }));
  const weightSeries = chrono.map((h) => ({ label: fmtDay(h.performedOn), value: cardio ? (h.durationMin == null ? null : Number(h.durationMin)) : maxWeight(toSets(h)) || null }));
  const volumeSeries = chrono.map((h) => ({ label: fmtDay(h.performedOn), value: cardio ? (h.distanceKm == null ? null : Number(h.distanceKm)) : totalVolume(toSets(h)) || null }));
  const best = cardio ? 0 : Math.max(0, ...history.map((h) => maxWeight(toSets(h))));

  return (
    <div className="space-y-6">
      <PageTitle title={ex.name} sub={`${ex.kind === 'cardio' ? 'Cardio' : ex.equipment} · ${ex.primary_muscles.join(', ')}`} action={<Link href={`/workouts/new?exercise=${ex.slug}`} className="btn btn-primary">Log this exercise</Link>} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <SectionTitle>How to do it</SectionTitle>
          {ex.youtube_video_id ? (
            <div>
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe src={embedUrl(ex.youtube_video_id)} title={ex.youtube_title ?? `${ex.name} tutorial`} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full w-full" />
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs muted"><ShieldCheck size={14} className="text-emerald-600" /> Link verified with YouTube{ex.youtube_title ? `: ${ex.youtube_title}` : ''}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-brand-sky/20 p-4 text-sm">
              <p className="font-semibold">No verified tutorial saved yet for this exercise.</p>
              <a href={searchUrl(ex.youtube_query ?? `${ex.name} proper form`)} target="_blank" rel="noopener noreferrer" className="btn btn-sky mt-3"><Play size={16} /> Search tutorials on YouTube <ExternalLink size={14} /></a>
              <p className="mt-2 text-xs muted">Found a good one? Paste it below and the whole crew will see it here.</p>
            </div>
          )}
          <VideoForm exerciseId={ex.id} hasVideo={!!ex.youtube_video_id} />
          {ex.instructions && <p className="mt-4 text-sm leading-relaxed">{ex.instructions}</p>}
          {ex.safety_notes && <p className="mt-3 rounded-xl bg-brand-orange/10 p-3 text-sm"><b>Safety:</b> {ex.safety_notes}</p>}
        </section>

        <section className="card">
          <SectionTitle>The crew on this {cardio ? 'machine' : 'lift'}</SectionTitle>
          {board.length === 0 ? <p className="text-sm muted">Nobody has logged this yet. Be the first!</p> : (
            <ul className="space-y-3">
              {[...board].sort((a, b) => b.bestWeightKg - a.bestWeightKg).map((r) => {
                const m = members.find((x) => x.id === r.memberId);
                if (!m) return null;
                const gain = pctChange(r.firstVolume, r.latestVolume);
                return (
                  <li key={r.memberId} className="flex items-center gap-3 rounded-xl bg-black/[.03] p-2 dark:bg-white/5">
                    <Avatar member={m} size={44} />
                    <div className="flex-1">
                      <div className="font-extrabold">{m.display_name}{r.memberId === s.memberId && <span className="ml-2 chip bg-brand-orange/15 text-brand-orange">you</span>}</div>
                      <div className="text-xs muted">{r.sessions} session{r.sessions === 1 ? '' : 's'} · last {r.latestOn ? fmtDay(r.latestOn) : '–'}</div>
                    </div>
                    <div className="text-right">
                      {!cardio && <div className="flex items-center justify-end gap-1 font-extrabold"><Trophy size={14} className="text-brand-orange" />{fmt(r.bestWeightKg)} kg</div>}
                      <div className="text-xs font-bold text-emerald-600">{gain == null ? 'baseline' : `${signed(gain, 1, '%')} since first session`}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs muted">Improvement compares each person only with their own first session, so starting weights don&apos;t matter.</p>
        </section>
      </div>

      <section className="card">
        <SectionTitle>My progress</SectionTitle>
        {history.length === 0 ? <p className="text-sm muted">You haven&apos;t logged this yet.</p> : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {!cardio && <Stat label="Personal best" value={`${fmt(best)} kg`} tone="orange" />}
              <Stat label="Sessions" value={history.length} />
              <Stat label="Last session" value={fmtDay(history[0]!.performedOn)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><h3 className="mb-1 text-sm font-extrabold">{cardio ? 'Duration (min)' : 'Top weight (kg)'}</h3><TrendChart data={weightSeries} unit={cardio ? 'min' : 'kg'} /></div>
              <div><h3 className="mb-1 text-sm font-extrabold">{cardio ? 'Distance (km)' : 'Volume (kg × reps)'}</h3><TrendChart data={volumeSeries} unit={cardio ? 'km' : 'kg'} color="#83D3F5" /></div>
            </div>
            <h3 className="mb-2 mt-5 text-sm font-extrabold">Last 5 sessions</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-sm">
                <tbody>
                  {history.slice(0, 5).map((h) => (
                    <tr key={h.sessionId} className="border-t border-[var(--line)]">
                      <td className="py-2 font-bold"><Link href={`/workouts/${h.sessionId}`} className="hover:text-brand-orange">{fmtDay(h.performedOn)}</Link></td>
                      <td className="muted">{cardio ? `${h.durationMin ?? '–'} min · ${h.distanceKm ?? '–'} km` : h.sets.map((v) => `${v.weight_kg ?? '–'}×${v.reps ?? '–'}`).join('  ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
