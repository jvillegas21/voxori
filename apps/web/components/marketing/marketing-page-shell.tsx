import { cn } from '@/lib/utils';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { RevealOnScroll } from '@/components/marketing/motion';

export { MARKETING_NAV_LINKS } from '@/components/marketing/marketing-nav-links';

interface MarketingPageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function MarketingPageShell({ children, className }: MarketingPageShellProps) {
  return (
    <div className={cn('flex min-h-screen flex-col bg-background fade-in-page', className)}>
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}

interface MarketingHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function MarketingHero({ eyebrow, title, description, children }: MarketingHeroProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <RevealOnScroll>
        <p className="text-sm font-medium uppercase tracking-widest text-secondary">{eyebrow}</p>
        <h1 className="font-heading mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{description}</p>
      </RevealOnScroll>
      {children && (
        <RevealOnScroll index={1} className="mt-10 flex flex-wrap gap-4">
          {children}
        </RevealOnScroll>
      )}
    </section>
  );
}
