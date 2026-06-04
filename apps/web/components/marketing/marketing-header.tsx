'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MarketingNavLink } from '@/components/marketing/motion';
import { MARKETING_NAV_LINKS } from '@/components/marketing/marketing-nav-links';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md transition-[border-color,box-shadow] duration-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/landing"
          className="font-heading text-xl font-semibold text-primary transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
        >
          Voxori
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Marketing">
          {MARKETING_NAV_LINKS.map(({ href, label }) => (
            <MarketingNavLink key={href} href={href} label={label} />
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="hidden cursor-pointer min-h-[44px] sm:inline-flex transition-interactive"
            asChild
          >
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button
            className="cta-primary cursor-pointer min-h-[44px]"
            asChild
          >
            <Link href="/sign-up">Start free trial</Link>
          </Button>
        </div>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto border-t border-border/40 px-6 py-2 sm:hidden"
        aria-label="Marketing mobile"
      >
        {MARKETING_NAV_LINKS.map(({ href, label }) => (
          <MarketingNavLink key={href} href={href} label={label} className="shrink-0" />
        ))}
      </nav>
    </header>
  );
}
