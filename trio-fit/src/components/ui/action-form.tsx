'use client';

import { createContext, useContext, useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useFeedback } from './feedback';
import { cn } from '@/lib/cn';
import type { ActionResult } from '@/lib/types';

const ResultCtx = createContext<ActionResult | null>(null);
const PendingCtx = createContext(false);

/**
 * Form wrapper for server actions. It submits through onSubmit (not the `action` prop) on purpose: React 19 would
 * reset every uncontrolled input after a failed submit, wiping what the user typed. Here inputs survive errors and
 * are only cleared when `resetOnSuccess` is set and the action succeeded.
 */
export function ActionForm({ action, children, className, resetOnSuccess = false }: { action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>; children: ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [state, setState] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const { handle } = useFeedback();
  const ref = useRef<HTMLFormElement>(null);
  const last = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    handle(state);
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, handle, resetOnSuccess]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        setState(await action(state, fd));
      } catch (err) {
        // redirect() inside a server action surfaces as a navigation, not an error; anything else is shown.
        if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw err;
        setState({ ok: false, error: 'Something went wrong. Please try again.' });
      }
    });
  }

  return (
    <ResultCtx.Provider value={state}>
      <PendingCtx.Provider value={pending}>
        <form ref={ref} onSubmit={onSubmit} className={className}>
          {state && !state.ok && state.error && !state.fieldErrors && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{state.error}</p>}
          {children}
        </form>
      </PendingCtx.Provider>
    </ResultCtx.Provider>
  );
}

export function Submit({ children, className = 'btn btn-primary', pendingText }: { children: ReactNode; className?: string; pendingText?: string }) {
  const pending = useContext(PendingCtx);
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <Loader2 size={16} className="animate-spin" />}
      {pending ? (pendingText ?? children) : children}
    </button>
  );
}

export function Field({ label, name, error, children, className, hint }: { label: string; name: string; error?: string; children?: ReactNode; className?: string; hint?: string }) {
  const res = useContext(ResultCtx);
  const err = error ?? res?.fieldErrors?.[name]?.[0];
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && !err && <span className="mt-1 block text-xs muted">{hint}</span>}
      {err && <span role="alert" className="mt-1 block text-xs font-semibold text-red-600">{err}</span>}
    </label>
  );
}
