'use client';

import { useState, useTransition } from 'react';
import { Bot, Plus, Search, Star, X } from 'lucide-react';
import { addSavedFoodAction, addSavedMealAction, forgetSavedFoodAction, deleteSavedMealAction, parseFoodAiAction, saveFoodAction, saveFoodDraftAction, searchFoodsAction } from '@/app/actions/kitchen';
import { ActionForm, Field, Submit } from '@/components/ui/action-form';
import { useFeedback } from '@/components/ui/feedback';
import { macrosForGrams } from '@/lib/domain/nutrition';
import type { FoodDraft } from '@/lib/ai/coach';
import type { FoodHit } from '@/lib/server/foodsearch';
import type { SavedFood } from '@/lib/server/nutrition';

const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Snack']] as const;
type Tab = 'quick' | 'search' | 'ai' | 'manual';

export function FoodAdder({ day, frequent, meals, aiReady }: { day: string; frequent: SavedFood[]; meals: { id: string; name: string; meal_type: string | null; count: number }[]; aiReady: boolean }) {
  const [tab, setTab] = useState<Tab>(frequent.length || meals.length ? 'quick' : 'manual');
  const [meal, setMeal] = useState<string>('lunch');
  const tabs: [Tab, string, React.ReactNode][] = [['quick', 'Quick add', <Star key="q" size={15} />], ['search', 'Search', <Search key="s" size={15} />], ['ai', 'AI assistant', <Bot key="a" size={15} />], ['manual', 'Manual', <Plus key="m" size={15} />]];
  return (
    <section className="card" aria-label="Add food">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2"><span className="label !mb-0">Meal</span>
          <select value={meal} onChange={(e) => setMeal(e.target.value)} className="!w-auto" aria-label="Meal">{MEALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
      </div>
      <div role="tablist" className="mt-3 flex gap-1 overflow-x-auto rounded-xl bg-black/5 p-1 dark:bg-white/10">
        {tabs.map(([k, label, icon]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex min-h-[40px] flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-bold ${tab === k ? 'bg-[var(--card)] shadow' : 'muted'}`}>{icon}{label}</button>)}
      </div>
      <div className="mt-4">
        {tab === 'quick' && <Quick day={day} meal={meal} frequent={frequent} meals={meals} />}
        {tab === 'search' && <SearchTab day={day} meal={meal} />}
        {tab === 'ai' && <AiTab day={day} meal={meal} aiReady={aiReady} />}
        {tab === 'manual' && <ManualForm day={day} meal={meal} />}
      </div>
    </section>
  );
}

function Quick({ day, meal, frequent, meals }: { day: string; meal: string; frequent: SavedFood[]; meals: { id: string; name: string; meal_type: string | null; count: number }[] }) {
  const { handle } = useFeedback();
  const [pending, start] = useTransition();
  if (!frequent.length && !meals.length) return <p className="text-sm muted">Foods you add with &ldquo;Remember for quick add&rdquo; and meals you save show up here for one-tap logging.</p>;
  return (
    <div className="space-y-4">
      {meals.length > 0 && <div><h3 className="mb-2 text-sm font-extrabold">Saved meals</h3><ul className="flex flex-wrap gap-2">{meals.map((m) => (
        <li key={m.id} className="flex items-center rounded-xl border border-[var(--line)]">
          <button disabled={pending} onClick={() => start(async () => handle(await addSavedMealAction(m.id, day, meal)))} className="min-h-[44px] px-3 text-sm font-bold">{m.name} <span className="muted">({m.count})</span></button>
          <button aria-label={`Delete saved meal ${m.name}`} onClick={() => start(async () => handle(await deleteSavedMealAction(m.id)))} className="grid h-11 w-9 place-items-center muted"><X size={14} /></button>
        </li>))}</ul></div>}
      {frequent.length > 0 && <div><h3 className="mb-2 text-sm font-extrabold">Frequent foods</h3><ul className="flex flex-wrap gap-2">{frequent.map((f) => (
        <li key={f.id} className="flex items-center rounded-xl border border-[var(--line)]">
          <button disabled={pending} onClick={() => start(async () => handle(await addSavedFoodAction(f.id, day, meal)))} className="min-h-[44px] px-3 text-left text-sm font-bold">{f.name}<span className="block text-[11px] font-normal muted">{f.default_quantity} {f.unit} · {Math.round(Number(f.calories))} kcal</span></button>
          <button aria-label={`Forget ${f.name}`} onClick={() => start(async () => handle(await forgetSavedFoodAction(f.id)))} className="grid h-11 w-9 place-items-center muted"><X size={14} /></button>
        </li>))}</ul></div>}
    </div>
  );
}

function ManualForm({ day, meal, initial }: { day: string; meal: string; initial?: Partial<{ name: string; quantity: number; unit: string; calories: number; proteinG: number; carbsG: number; fatG: number; source: string }> }) {
  return (
    <ActionForm action={saveFoodAction} resetOnSuccess className="space-y-3">
      <input type="hidden" name="eatenOn" value={day} />
      <input type="hidden" name="mealType" value={meal} />
      <input type="hidden" name="source" value={initial?.source ?? 'manual'} />
      <Field label="Food" name="name"><input name="name" required maxLength={120} defaultValue={initial?.name} placeholder="e.g. Grilled chicken" /></Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Amount" name="quantity"><input name="quantity" type="number" step="any" min="0.01" inputMode="decimal" required defaultValue={initial?.quantity} /></Field>
        <Field label="Unit" name="unit"><select name="unit" defaultValue={initial?.unit ?? 'g'}>{['g', 'ml', 'piece', 'slice', 'cup', 'spoon', 'serving'].map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="Calories" name="calories"><input name="calories" type="number" step="any" min="0" inputMode="decimal" required defaultValue={initial?.calories} /></Field>
        <Field label="Protein (g)" name="proteinG"><input name="proteinG" type="number" step="any" min="0" inputMode="decimal" defaultValue={initial?.proteinG} /></Field>
        <Field label="Carbs (g)" name="carbsG"><input name="carbsG" type="number" step="any" min="0" inputMode="decimal" defaultValue={initial?.carbsG} /></Field>
        <Field label="Fat (g)" name="fatG"><input name="fatG" type="number" step="any" min="0" inputMode="decimal" defaultValue={initial?.fatG} /></Field>
        <Field label="Fiber (g)" name="fiberG"><input name="fiberG" type="number" step="any" min="0" inputMode="decimal" /></Field>
      </div>
      <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold"><input type="checkbox" name="remember" /> Remember for quick add</label>
      <p className="text-xs muted">Values you type are saved as your own entry (not marked as verified).</p>
      <Submit>Add food</Submit>
    </ActionForm>
  );
}

function SearchTab({ day, meal }: { day: string; meal: string }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<FoodHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [pick, setPick] = useState<FoodHit | null>(null);
  const [grams, setGrams] = useState('100');
  function run(e: React.FormEvent) {
    e.preventDefault();
    start(async () => { const r = await searchFoodsAction(q); setHits(r.hits); setError(r.error ?? null); setPick(null); });
  }
  const m = pick ? macrosForGrams(pick.per100g, Number(grams) || 0) : null;
  return (
    <div className="space-y-3">
      <form onSubmit={run} className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a food (e.g. rice, tuna)" aria-label="Search food" /><button className="btn btn-sky" disabled={pending || q.trim().length < 2}>{pending ? '…' : 'Search'}</button></form>
      {error && <p className="rounded-xl bg-brand-orange/15 p-3 text-sm">{error}</p>}
      {hits && hits.length === 0 && !error && <p className="text-sm muted">No results. Try a simpler word, or use Manual.</p>}
      {!pick && hits && hits.length > 0 && <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">{hits.map((h, i) => <li key={i}><button onClick={() => setPick(h)} className="flex min-h-[52px] w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-black/5"><span><b>{h.name}</b>{h.brand && <span className="muted"> · {h.brand}</span>}</span><span className="shrink-0 text-xs muted">{Math.round(h.per100g.calories)} kcal/100g</span></button></li>)}</ul>}
      {pick && m && (
        <ActionForm action={saveFoodAction} className="space-y-3 rounded-xl border border-brand-sky p-3">
          <p className="font-extrabold">{pick.name}</p>
          <input type="hidden" name="eatenOn" value={day} /><input type="hidden" name="mealType" value={meal} /><input type="hidden" name="name" value={pick.name} /><input type="hidden" name="unit" value="g" /><input type="hidden" name="source" value="openfoodfacts" />
          <input type="hidden" name="calories" value={m.calories} /><input type="hidden" name="proteinG" value={m.proteinG} /><input type="hidden" name="carbsG" value={m.carbsG} /><input type="hidden" name="fatG" value={m.fatG} /><input type="hidden" name="fiberG" value={m.fiberG} /><input type="hidden" name="grams" value={grams} />
          <Field label="Amount eaten (g)" name="quantity"><input name="quantity" type="number" min="1" step="any" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} required /></Field>
          <p className="text-sm"><b>{m.calories} kcal</b> · P {m.proteinG} g · C {m.carbsG} g · F {m.fatG} g <span className="muted">(from Open Food Facts, community data)</span></p>
          <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold"><input type="checkbox" name="remember" /> Remember for quick add</label>
          <div className="flex gap-2"><Submit>Add to {meal}</Submit><button type="button" className="btn btn-ghost" onClick={() => setPick(null)}>Back</button></div>
        </ActionForm>
      )}
    </div>
  );
}

type DraftItem = FoodDraft[number];
function AiTab({ day, meal, aiReady }: { day: string; meal: string; aiReady: boolean }) {
  const { handle, toast } = useFeedback();
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<DraftItem[] | null>(null);
  const [pending, start] = useTransition();
  if (!aiReady) return <p className="rounded-xl bg-brand-sky/20 p-3 text-sm">The AI food assistant needs <code>ANTHROPIC_API_KEY</code> on the server. Until then use Search or Manual: everything else works.</p>;
  const upd = (i: number, p: Partial<DraftItem>) => setDraft((d) => d && d.map((x, n) => (n === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={600} placeholder='Type what you ate, e.g. "200 g cooked rice and 150 g grilled chicken"' aria-label="What did you eat" dir="auto" />
      <button className="btn btn-sky" disabled={pending || text.trim().length < 3} onClick={() => start(async () => { const r = await parseFoodAiAction(text); if (r.items) setDraft(r.items); else toast(r.reason ?? 'Could not read that', 'error'); })}>{pending ? 'Reading…' : 'Turn into a draft'}</button>
      {draft && (
        <div className="space-y-3 rounded-xl border border-brand-orange/50 p-3">
          <p className="text-sm font-bold">Draft: AI estimates, nothing saved yet. Check and fix before saving.</p>
          {draft.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl bg-black/[.03] p-3 dark:bg-white/5">
              <div className="flex items-center justify-between gap-2"><input value={it.name} onChange={(e) => upd(i, { name: e.target.value })} aria-label="Food name" /><span className={`chip shrink-0 ${it.confidence === 'high' ? 'bg-brand-green/40' : it.confidence === 'medium' ? 'bg-brand-sky/40' : 'bg-brand-orange/30'}`}>{it.confidence} confidence</span></div>
              {it.question && <p className="text-sm font-semibold text-brand-orange">❓ {it.question}</p>}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {([['quantity', 'Amount'], ['calories', 'kcal'], ['proteinG', 'Protein'], ['carbsG', 'Carbs'], ['fatG', 'Fat']] as const).map(([k, label]) => (
                  <label key={k}><span className="label">{label}{k === 'quantity' ? ` (${it.unit})` : ''}</span><input type="number" step="any" min="0" value={it[k]} onChange={(e) => upd(i, { [k]: Number(e.target.value) } as Partial<DraftItem>)} /></label>
                ))}
              </div>
              <button className="text-xs font-bold text-red-600" onClick={() => setDraft((d) => d && d.filter((_, n) => n !== i))}>Remove</button>
            </div>
          ))}
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={pending || draft.length === 0} onClick={() => start(async () => { const r = await saveFoodDraftAction(draft, day, meal); handle(r); if (r.ok) { setDraft(null); setText(''); } })}>Confirm &amp; save as estimates</button>
            <button className="btn btn-ghost" onClick={() => setDraft(null)}>Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}
