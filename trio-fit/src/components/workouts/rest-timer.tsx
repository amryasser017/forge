'use client';

import { useEffect, useRef, useState } from 'react';
import { Timer, X } from 'lucide-react';

export function RestTimer() {
  const [left, setLeft] = useState(0);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  function start(sec: number) {
    if (timer.current) clearInterval(timer.current);
    setTotal(sec);
    setLeft(sec);
    timer.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          if (timer.current) clearInterval(timer.current);
          try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ }
          return 0;
        }
        return l - 1;
      });
    }, 1000);
  }
  function stop() {
    if (timer.current) clearInterval(timer.current);
    setLeft(0);
  }
  const running = left > 0;
  const mm = String(Math.floor(left / 60)).padStart(1, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className="fixed bottom-20 right-3 z-40 md:bottom-6">
      {open ? (
        <div className="w-60 rounded-xl2 border border-[var(--line)] bg-[var(--card)] p-3 shadow-xl" role="timer" aria-live="off">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase muted">Rest timer</span>
            <button onClick={() => setOpen(false)} aria-label="Close timer" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-black/5"><X size={16} /></button>
          </div>
          <div className={`my-2 text-center text-4xl font-extrabold tabular-nums ${running ? 'text-brand-orange' : total && left === 0 ? 'text-emerald-600' : ''}`}>{running ? `${mm}:${ss}` : total ? 'Go!' : '0:00'}</div>
          <div className="grid grid-cols-3 gap-2">
            {[60, 90, 120].map((s) => <button key={s} type="button" onClick={() => start(s)} className="btn btn-ghost !px-0">{s}s</button>)}
          </div>
          {running && <button type="button" onClick={stop} className="btn btn-danger mt-2 w-full">Stop</button>}
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="btn btn-sky h-14 w-14 !rounded-full shadow-lg" aria-label="Open rest timer"><Timer size={22} />{running && <span className="ml-1 text-xs tabular-nums">{left}</span>}</button>
      )}
    </div>
  );
}
