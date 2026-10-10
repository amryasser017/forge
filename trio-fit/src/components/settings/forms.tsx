'use client';

import { useTransition } from 'react';
import { Lock, Palette } from 'lucide-react';
import { saveRulesAction, saveSettingsAction } from '@/app/actions/settings';
import { buyCosmeticAction, equipCosmeticAction } from '@/app/actions/team';
import { ActionForm, Field, Submit } from '@/components/ui/action-form';
import { useFeedback } from '@/components/ui/feedback';
import { WEEKDAY_NAMES, WEEK_ORDER } from '@/lib/domain/time';
import { XP_RULE_LABELS, type XpRules } from '@/lib/domain/xp';
import type { Cosmetic, Member } from '@/lib/types';

export function ProfileForm({ member }: { member: Member }) {
  return (
    <ActionForm action={saveSettingsAction} className="space-y-4">
      <Field label="Display name" name="displayName"><input name="displayName" defaultValue={member.display_name} required maxLength={30} /></Field>
      <fieldset>
        <legend className="label">Training days (your weekly schedule)</legend>
        <div className="flex flex-wrap gap-2">
          {WEEK_ORDER.map((i) => (
            <label key={i} className="cursor-pointer"><input type="checkbox" name="workoutDays" value={i} defaultChecked={member.workout_days.includes(i)} className="peer sr-only" /><span className="grid min-h-[44px] min-w-[56px] place-items-center rounded-xl border border-[var(--line)] px-3 text-sm font-bold peer-checked:border-brand-orange peer-checked:bg-brand-orange peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-sky">{WEEKDAY_NAMES[i]!.slice(0, 3)}</span></label>
          ))}
        </div>
        <p className="mt-1 text-xs muted">Unchecked days are rest days: they never break your streak.</p>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Coach message tone" name="tone"><select name="tone" defaultValue={member.tone}><option value="hype">Hype</option><option value="calm">Calm</option><option value="funny">Funny</option></select></Field>
        <Field label="Message language" name="language"><select name="language" defaultValue={member.language}><option value="ar">العربية (مصري)</option><option value="en">English</option></select></Field>
        <Field label="Theme" name="theme"><select name="theme" defaultValue={member.theme}><option value="light">Light</option><option value="dark">Dark</option></select></Field>
      </div>
      <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold"><input type="checkbox" name="messagesEnabled" defaultChecked={member.messages_enabled} /> Show encouragement messages after real events</label>
      <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold"><input type="checkbox" name="shareBodyStats" defaultChecked={member.share_body_stats} /> Let the crew see my weight and body-fat on the dashboard (food, notes and photos always stay private)</label>
      <Submit>Save settings</Submit>
    </ActionForm>
  );
}

export function Shop({ items, coins, equippedTitle, equippedFrame }: { items: (Cosmetic & { owned: boolean })[]; coins: number; equippedTitle: string | null; equippedFrame: string | null }) {
  const { handle } = useFeedback();
  const [pending, start] = useTransition();
  return (
    <div>
      <p className="mb-3 text-sm">You have <b className="text-brand-orange">{coins} coins</b>. Coins only buy looks (titles &amp; avatar frames): they never change rankings.</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((i) => {
          const equipped = i.kind === 'title' ? equippedTitle === i.key : equippedFrame === i.key;
          return (
            <li key={i.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3">
              {i.kind === 'frame' ? <span className="h-9 w-9 shrink-0 rounded-full bg-white" style={{ boxShadow: `0 0 0 3px ${i.value}` }} aria-hidden /> : <Palette size={20} className="shrink-0 text-brand-orange" aria-hidden />}
              <div className="min-w-0 flex-1"><div className="truncate font-bold">{i.name}</div><div className="text-xs muted">{i.owned ? 'Unlocked' : `${i.cost_coins} coins`}</div></div>
              {i.owned ? (
                <button disabled={pending} onClick={() => start(async () => handle(await equipCosmeticAction(i.kind, equipped ? null : i.key)))} className={`btn ${equipped ? 'btn-green' : 'btn-ghost'} !min-h-[40px]`}>{equipped ? 'Equipped' : 'Equip'}</button>
              ) : (
                <button disabled={pending || coins < i.cost_coins} onClick={() => start(async () => handle(await buyCosmeticAction(i.id)))} className="btn btn-primary !min-h-[40px]">{coins < i.cost_coins ? <Lock size={14} /> : null} Unlock</button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function RulesForm({ rules }: { rules: XpRules }) {
  return (
    <ActionForm action={saveRulesAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(rules) as (keyof XpRules)[]).map((k) => <Field key={k} label={XP_RULE_LABELS[k]} name={k}><input name={k} type="number" min={0} max={10000} inputMode="numeric" defaultValue={rules[k]} /></Field>)}
      </div>
      <p className="text-xs muted">Applies to future rewards only. XP is paid by the server once per event: editing or re-saving a record never pays twice.</p>
      <Submit>Save reward values</Submit>
    </ActionForm>
  );
}
