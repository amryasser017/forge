'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, Home, MessageCircleHeart, Salad, User, Users } from 'lucide-react';
import { cn } from '@/lib/cn';

export function NavLinks({ slug, variant }: { slug: string; variant: 'bottom' | 'side' }) {
  const path = usePathname();
  const items = [
    { href: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
    { href: '/workouts', label: 'Arena', icon: Dumbbell, match: (p: string) => p.startsWith('/workouts') || p.startsWith('/exercises') },
    { href: '/kitchen', label: 'Kitchen', icon: Salad, match: (p: string) => p.startsWith('/kitchen') },
    { href: '/coach', label: 'Coach', icon: MessageCircleHeart, match: (p: string) => p.startsWith('/coach') },
    { href: '/team', label: 'Team', icon: Users, match: (p: string) => p.startsWith('/team') },
    { href: `/members/${slug}`, label: 'Me', icon: User, match: (p: string) => p.startsWith('/members') },
  ];
  if (variant === 'bottom') {
    return (
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[var(--line)] bg-[var(--card)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map(({ href, label, icon: Icon, match }) => (
          <Link key={href} href={href} aria-current={match(path) ? 'page' : undefined} className={cn('flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold', match(path) ? 'text-brand-orange' : 'muted')}>
            <Icon size={22} />
            {label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav aria-label="Main" className="hidden gap-1 md:flex">
      {items.map(({ href, label, icon: Icon, match }) => (
        <Link key={href} href={href} aria-current={match(path) ? 'page' : undefined} className={cn('flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold', match(path) ? 'bg-brand-orange text-white' : 'hover:bg-black/5 dark:hover:bg-white/5')}>
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
