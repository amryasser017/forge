import type { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import type { LevelInfo } from '@/lib/domain/xp';
import type { Member } from '@/lib/types';

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl2 border-2 border-dashed border-[var(--line)] p-6 text-center">
      {icon && <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-brand-sky/25 text-brand-navy dark:text-brand-sky">{icon}</div>}
      <h3 className="text-lg">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm muted">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, color = 'bg-brand-orange', label }: { value: number; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-3 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
      <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Avatar({ member, size = 56, frame }: { member: Pick<Member, 'display_name' | 'avatar_url' | 'slug'>; size?: number; frame?: string | null }) {
  const color = frame ?? ({ amr: '#F28C28', aman: '#83D3F5', shady: '#8DDE75' } as const)[member.slug];
  return (
    <span className="relative inline-block shrink-0 overflow-hidden rounded-full bg-white" style={{ width: size, height: size, boxShadow: `0 0 0 3px ${color}` }}>
      {member.avatar_url ? <Image src={member.avatar_url} alt={member.display_name} width={size * 2} height={size * 2} className="h-full w-full object-cover object-top" /> : <span className="grid h-full w-full place-items-center font-extrabold">{member.display_name.slice(0, 1)}</span>}
    </span>
  );
}

export function LevelBadge({ level }: { level: LevelInfo }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs font-bold">
        <span>Level {level.level} · {level.title}</span>
        <span className="muted">{level.xpIntoLevel}/{level.xpForNext} XP</span>
      </div>
      <div className="mt-1"><ProgressBar value={level.progress * 100} label={`Progress to level ${level.level + 1}`} /></div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'orange' | 'sky' | 'green' }) {
  const t = tone === 'orange' ? 'text-brand-orange' : tone === 'green' ? 'text-emerald-600 dark:text-brand-green' : tone === 'sky' ? 'text-sky-600 dark:text-brand-sky' : '';
  return (
    <div className="rounded-xl bg-black/[.03] p-3 dark:bg-white/5">
      <div className="text-xs font-bold uppercase tracking-wide muted">{label}</div>
      <div className={cn('mt-0.5 text-2xl font-extrabold', t)}>{value}</div>
      {sub && <div className="text-xs muted">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-lg">{children}</h2>
      {right}
    </div>
  );
}

export function Notice({ children, tone = 'sky' }: { children: ReactNode; tone?: 'sky' | 'orange' }) {
  return <div className={cn('rounded-xl px-3 py-2 text-sm', tone === 'sky' ? 'bg-brand-sky/25' : 'bg-brand-orange/15')}>{children}</div>;
}

export const fmt = (n: number | null | undefined, digits = 1) => (n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: digits }));
export const signed = (n: number | null | undefined, digits = 1, suffix = '') => (n == null ? '—' : `${n > 0 ? '+' : ''}${fmt(n, digits)}${suffix}`);
