'use client';

import { useState, useTransition } from 'react';
import { Moon, Sun } from 'lucide-react';
import { setThemeAction } from '@/app/actions/settings';

export function ThemeToggle({ initial }: { initial: 'light' | 'dark' }) {
  const [theme, setTheme] = useState(initial);
  const [, start] = useTransition();
  function flip() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.getElementById('theme-root')?.classList.toggle('dark', next === 'dark');
    start(() => { void setThemeAction(next); });
  }
  return (
    <button onClick={flip} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
