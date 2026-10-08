'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Trophy, X } from 'lucide-react';
import type { ActionResult, RewardSummary } from '@/lib/types';

interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'error';
}
interface Ctx {
  toast: (text: string, kind?: 'ok' | 'error') => void;
  celebrate: (r: RewardSummary) => void;
  /** Handle any ActionResult: toast, celebration, redirect, refresh. */
  handle: (r: ActionResult, opts?: { silent?: boolean }) => void;
}
const FeedbackCtx = createContext<Ctx | null>(null);
export const useFeedback = () => {
  const c = useContext(FeedbackCtx);
  if (!c) throw new Error('FeedbackProvider missing');
  return c;
};

const CONFETTI = ['#F28C28', '#83D3F5', '#8DDE75', '#FFD166', '#172B4D'];

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ id: i, left: Math.random() * 100, delay: Math.random() * 0.6, size: 6 + Math.random() * 8, color: CONFETTI[i % CONFETTI.length], dur: 2.2 + Math.random() * 1.6 })), []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span key={p.id} style={{ left: `${p.left}%`, top: -20, width: p.size, height: p.size * 1.6, background: p.color, animation: `confetti-fall ${p.dur}s ${p.delay}s ease-in forwards` }} className="absolute rounded-sm" />
      ))}
    </div>
  );
}

function Celebration({ r, onClose }: { r: RewardSummary; onClose: () => void }) {
  const big = r.levelUp != null || r.prs.length > 0 || r.achievements.length > 0 || r.challenges.length > 0;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/60 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Rewards">
      {big && <Confetti />}
      <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="relative w-full max-w-sm rounded-xl2 bg-[var(--card)] p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-[var(--muted)] hover:bg-black/5"><X size={18} /></button>
        {r.levelUp != null ? (
          <>
            <div className="text-5xl">🎉</div>
            <h2 className="mt-2 text-3xl text-brand-orange">LEVEL UP!</h2>
            <p className="mt-1 text-lg font-bold">You reached level {r.levelUp}</p>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-orange/15 text-brand-orange"><Sparkles /></div>
            <h2 className="mt-2 text-2xl">Nice work!</h2>
          </>
        )}
        <div className="mt-4 flex justify-center gap-3">
          {r.xp > 0 && <span className="chip bg-brand-orange/15 text-brand-orange">+{r.xp} XP</span>}
          {r.coins > 0 && <span className="chip bg-brand-sky/30 text-brand-navy dark:text-brand-sky">+{r.coins} coins</span>}
        </div>
        {(r.prs.length > 0 || r.achievements.length > 0 || r.challenges.length > 0) && (
          <ul className="mt-4 space-y-1 text-left text-sm">
            {r.prs.map((p) => <li key={p} className="flex items-center gap-2"><Trophy size={16} className="text-brand-orange" /> New personal record: <b>{p}</b></li>)}
            {r.achievements.map((a) => <li key={a} className="flex items-center gap-2"><Trophy size={16} className="text-brand-green" /> Achievement: <b>{a}</b></li>)}
            {r.challenges.map((c) => <li key={c} className="flex items-center gap-2"><Trophy size={16} className="text-brand-sky" /> Challenge complete: <b>{c}</b></li>)}
          </ul>
        )}
        {r.message && <p dir="auto" className="mt-4 rounded-xl bg-brand-gray p-3 text-sm font-semibold text-brand-navy">{r.message}</p>}
        <button onClick={onClose} className="btn btn-primary mt-5 w-full">Keep going</button>
      </motion.div>
    </motion.div>
  );
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [reward, setReward] = useState<RewardSummary | null>(null);

  const toast = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const celebrate = useCallback((r: RewardSummary) => setReward(r), []);
  const handle = useCallback(
    (r: ActionResult, opts?: { silent?: boolean }) => {
      if (!r.ok) {
        if (r.error) toast(r.error, 'error');
        if (r.redirectTo) router.push(r.redirectTo);
        return;
      }
      if (r.message && !opts?.silent) toast(r.message);
      const rw = r.reward;
      if (rw && (rw.xp > 0 || rw.levelUp != null || rw.prs.length || rw.achievements.length || rw.challenges.length)) celebrate(rw);
      if (r.redirectTo) router.push(r.redirectTo);
      else router.refresh();
    },
    [toast, celebrate, router],
  );
  const value = useMemo(() => ({ toast, celebrate, handle }), [toast, celebrate, handle]);

  return (
    <FeedbackCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${t.kind === 'ok' ? 'bg-brand-navy text-white' : 'bg-red-600 text-white'}`}>{t.text}</div>
        ))}
      </div>
      <AnimatePresence>{reward && <Celebration r={reward} onClose={() => setReward(null)} />}</AnimatePresence>
    </FeedbackCtx.Provider>
  );
}
