import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { Brand } from '@/components/nav/brand';
import { NavLinks } from '@/components/nav/nav-links';
import { ThemeToggle } from '@/components/nav/theme-toggle';
import { Avatar } from '@/components/ui/bits';
import { FeedbackProvider } from '@/components/ui/feedback';
import { missingConfig } from '@/lib/server/env';
import { getMember, getTotalsFor, cosmeticsByKey } from '@/lib/server/members';
import { getSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (missingConfig().length) redirect('/login');
  const s = await getSession();
  if (!s) redirect('/login');
  const me = await getMember(s.memberId);
  if (!me) redirect('/login');
  const [totals, cos] = await Promise.all([getTotalsFor(me.id), cosmeticsByKey()]);
  const frame = me.equipped_frame ? cos[me.equipped_frame]?.value : null;

  return (
    <div id="theme-root" className={`${me.theme === 'dark' ? 'dark ' : ''}min-h-screen bg-[var(--bg)] text-[var(--ink)]`}>
      <FeedbackProvider>
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--card)]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
            <Link href="/" aria-label="TRIO FIT home"><Brand /></Link>
            <NavLinks slug={me.slug} variant="side" />
            <div className="flex items-center gap-1">
              <Link href={`/members/${me.slug}`} className="flex min-h-[44px] items-center gap-2 rounded-xl px-2 hover:bg-black/5 dark:hover:bg-white/5" aria-label="My profile">
                <Avatar member={me} size={34} frame={frame} />
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-sm font-extrabold">{me.display_name}</span>
                  <span className="block text-[11px] font-bold text-brand-orange">Lv {totals.level.level} · {totals.coins} coins</span>
                </span>
              </Link>
              <ThemeToggle initial={me.theme} />
              <Link href="/settings" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5" aria-label="Settings"><Settings size={20} /></Link>
              <form action={logoutAction}><button className="grid h-11 w-11 place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5" aria-label="Sign out"><LogOut size={20} /></button></form>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:pb-10">{children}</main>
        <NavLinks slug={me.slug} variant="bottom" />
      </FeedbackProvider>
    </div>
  );
}
