export function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className="inline-flex items-center gap-2 font-extrabold tracking-tight">
      <span className="flex -space-x-1.5" aria-hidden>
        <i className="h-3.5 w-3.5 rounded-full bg-brand-orange ring-2 ring-[var(--card)]" />
        <i className="h-3.5 w-3.5 rounded-full bg-brand-sky ring-2 ring-[var(--card)]" />
        <i className="h-3.5 w-3.5 rounded-full bg-brand-green ring-2 ring-[var(--card)]" />
      </span>
      <span className={size === 'lg' ? 'text-4xl' : 'text-xl'}>TRIO <span className="text-brand-orange">FIT</span></span>
    </span>
  );
}
