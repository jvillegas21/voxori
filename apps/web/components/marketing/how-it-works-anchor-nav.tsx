import Link from 'next/link';
import { cn } from '@/lib/utils';

const ANCHOR_LINKS = [
  { href: '#before-after', label: 'Before & after' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#dashboard', label: 'Dashboard' },
  { href: '#integrations', label: 'Integrations' },
] as const;

export function HowItWorksAnchorNav({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        'flex flex-wrap gap-2 border-b border-border/60 pb-4',
        className
      )}
      aria-label="On this page"
    >
      <span className="w-full text-xs font-medium uppercase tracking-widest text-muted-foreground sm:w-auto sm:mr-2 sm:self-center">
        On this page
      </span>
      {ANCHOR_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="cursor-pointer rounded-lg border border-border/60 bg-card px-3 py-2 text-sm text-muted-foreground transition-interactive hover:border-primary/30 hover:text-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] inline-flex items-center"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
