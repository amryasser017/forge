import Link from 'next/link';
import { ChevronLeft, ChevronRight, Salad } from 'lucide-react';
import { EntryRow } from '@/components/kitchen/entry-row';
import { CompleteDay, MealIdeas, SaveMeal } from '@/components/kitchen/day-controls';
import { FoodAdder } from '@/components/kitchen/food-adder';
import { WaterTracker } from '@/components/quick-actions';
import { EmptyState, PageTitle, ProgressBar, SectionTitle } from '@/components/ui/bits';
import { BarsChart } from '@/components/ui/charts';
import { MEAL_TYPES, percentOfTarget } from '@/lib/domain/nutrition';
import { addDays, dayKey, fmtDay, rangeKeys } from '@/lib/domain/time';
import { db, must } from '@/lib/server/db';
import { aiConfigured } from '@/lib/server/env';
import { getGoals } from '@/lib/server/members';
import { checkInsRange, foodForDay, foodRange, frequentFoods, getCheckIn, macrosOf, waterByDay, waterForDay } from '@/lib/server/nutrition';
import { requireSession } from '@/lib/server/session';
import { timezone } from '@/lib/server/settings';
import { workoutDays } from '@/lib/server/workouts';
import { dateKey } from '@/lib/validation';

export const metadata = { title: 'Trio Kitchen' };
const LABEL: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' };

function Macro({ label, value, target, color }: { label: string; value: number; target: number | null; color: string }) {
  const pct = percentOfTarget(value, target);
  return (
    <div>
      <div className="flex justify-between text-sm"><b>{label}</b><span className="muted">{Math.round(value)}{target ? ` / ${target}` : ''}{label === 'Calories' ? ' kcal' : ' g'}</span></div>
      <div className="mt-1"><ProgressBar value={pct ?? 0} color={color} label={label} /></div>
    </div>
  );
}

export default async function Kitchen({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const s = await requireSession();
  const today = dayKey(new Date(), timezone());
  const sp = await searchParams;
  const day = sp.date && dateKey.safeParse(sp.date).success && sp.date <= today ? sp.date : today;
  const weekFrom = addDays(day, -6);
  const [goals, rows, water, checkIn, frequent, saved, weekFood, weekWater, weekChecks, wdays] = await Promise.all([
    getGoals(s.memberId), foodForDay(s.memberId, day), waterForDay(s.memberId, day), getCheckIn(s.memberId, day), frequentFoods(s.memberId),
    db().from('saved_meals').select('id, name, meal_type, items').eq('member_id', s.memberId).order('created_at', { ascending: false }).limit(12).then((r) => must(r) as { id: string; name: string; meal_type: string | null; items: unknown[] }[]),
    foodRange(s.memberId, weekFrom, day), waterByDay(s.memberId, weekFrom, day), checkInsRange(s.memberId, weekFrom, day), workoutDays(s.memberId),
  ]);
  const m = macrosOf(rows);
  const logged = new Set(weekFood.map((f) => f.eaten_on));
  const week = rangeKeys(weekFrom, day).map((d) => {
    const mm = macrosOf(weekFood.filter((f) => f.eaten_on === d));
    return { d, kcal: logged.has(d) ? mm.calories : null, protein: mm.proteinG, water: weekWater[d] ?? 0, trained: wdays.includes(d), complete: weekChecks.find((c) => c.day === d)?.food_log_complete ?? false };
  });
  const remainingCal = goals.calorie_target ? Math.max(0, goals.calorie_target - m.calories) : null;
  const remainingPro = goals.protein_target_g ? Math.max(0, goals.protein_target_g - m.proteinG) : null;

  return (
    <div className="space-y-5">
      <PageTitle title="Trio Kitchen" sub="Your honest food diary. Estimates are labelled; unlogged days stay unknown." action={
        <div className="flex items-center gap-1">
          <Link href={`/kitchen?date=${addDays(day, -1)}`} className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--line)]" aria-label="Previous day"><ChevronLeft /></Link>
          <span className="min-w-[110px] text-center text-sm font-extrabold">{day === today ? 'Today' : fmtDay(day, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          {day < today ? <Link href={`/kitchen?date=${addDays(day, 1)}`} className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--line)]" aria-label="Next day"><ChevronRight /></Link> : <span className="h-11 w-11" />}
        </div>} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <SectionTitle>Day summary</SectionTitle>
          <Macro label="Calories" value={m.calories} target={goals.calorie_target} color="bg-brand-orange" />
          <Macro label="Protein" value={m.proteinG} target={goals.protein_target_g} color="bg-brand-green" />
          <Macro label="Carbs" value={m.carbsG} target={goals.carbs_target_g} color="bg-brand-sky" />
          <Macro label="Fat" value={m.fatG} target={goals.fat_target_g} color="bg-brand-orange/60" />
          {!goals.calorie_target && <p className="text-xs muted">Set your daily targets on your <Link href="/settings" className="font-bold text-brand-orange">profile goals</Link> to see progress bars.</p>}
          <CompleteDay day={day} complete={checkIn?.food_log_complete ?? false} count={rows.length} />
        </section>
        <section className="card"><SectionTitle>Water</SectionTitle><WaterTracker day={day} consumed={water} goal={goals.water_target_ml} /></section>
      </div>

      <FoodAdder day={day} frequent={frequent} meals={saved.map((x) => ({ id: x.id, name: x.name, meal_type: x.meal_type, count: x.items.length }))} aiReady={aiConfigured()} />

      <section className="card">
        <SectionTitle>Food log</SectionTitle>
        {rows.length === 0 ? <EmptyState icon={<Salad />} title="Nothing logged for this day" body="Add what you actually ate above. If you skip logging, the day simply stays unlogged." /> : (
          <div className="space-y-4">
            {MEAL_TYPES.map((t) => {
              const items = rows.filter((r) => r.meal_type === t);
              if (!items.length) return null;
              return (
                <div key={t}>
                  <div className="flex items-center justify-between"><h3 className="font-extrabold">{LABEL[t]}</h3><span className="text-sm font-bold text-brand-orange">{Math.round(items.reduce((a, i) => a + Number(i.calories), 0))} kcal</span></div>
                  <ul className="divide-y divide-[var(--line)]">{items.map((f) => <EntryRow key={f.id} f={f} />)}</ul>
                  <SaveMeal day={day} meal={t} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <SectionTitle>Last 7 days</SectionTitle>
          <BarsChart data={week.map((w) => ({ label: fmtDay(w.d, { weekday: 'short' }), value: w.kcal }))} unit="kcal" target={goals.calorie_target} />
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead><tr className="text-left text-xs uppercase muted"><th className="py-1">Day</th><th>kcal</th><th>Protein</th><th>Water</th><th>Type</th></tr></thead><tbody>
            {week.map((w) => (
              <tr key={w.d} className="border-t border-[var(--line)]"><td className="py-1.5 font-bold">{fmtDay(w.d, { weekday: 'short', day: 'numeric' })}</td><td>{w.kcal == null ? <span className="muted">not logged</span> : w.kcal}</td><td>{w.kcal == null ? '–' : `${Math.round(w.protein)} g`}</td><td>{w.water ? `${w.water} ml` : '–'}</td><td><span className={`chip ${w.trained ? 'bg-brand-orange/20 text-brand-orange' : 'bg-black/5 dark:bg-white/10'}`}>{w.trained ? 'Training' : 'Rest/none'}</span></td></tr>
            ))}</tbody></table></div>
        </section>
        <section className="card"><SectionTitle>Meal ideas</SectionTitle><MealIdeas remainingCalories={remainingCal} remainingProtein={remainingPro} /></section>
      </div>
    </div>
  );
}
