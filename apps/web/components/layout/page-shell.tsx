import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  backHref?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageShell({
  title,
  description,
  children,
  backHref,
  actions,
  className,
}: PageShellProps) {
  return (
    <div className={cn('fade-in-page', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          {backHref && (
            <Link
              href={backHref}
              className="mb-2 inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </Link>
          )}
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}

interface StubCardProps {
  title: string;
  description: string;
  badge?: string;
}

export function StubCard({ title, description, badge = 'Coming soon' }: StubCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm card-lift">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {badge}
        </span>
      </div>
    </div>
  );
}
