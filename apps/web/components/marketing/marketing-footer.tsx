import Link from 'next/link';
import { MARKETING_NAV_LINKS } from '@/components/marketing/marketing-nav-links';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-lg font-semibold text-primary">Voxori</p>
          <p className="mt-1 text-sm text-muted-foreground">
            AI inside sales agent for residential real estate.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          {MARKETING_NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] inline-flex items-center"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/waitlist"
            className="cursor-pointer text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] inline-flex items-center"
          >
            Waitlist
          </Link>
        </nav>
      </div>
      <p className="border-t border-border/40 py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Voxori. Built for real estate professionals.
      </p>
    </footer>
  );
}
