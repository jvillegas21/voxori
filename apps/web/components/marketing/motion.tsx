'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motionClassNames, staggerDelay } from '@/lib/motion';

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

export function RevealOnScroll({ children, className, index = 0 }: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(motionClassNames.reveal, visible && motionClassNames.revealVisible, className)}
      style={{ transitionDelay: `${staggerDelay(index)}ms` }}
    >
      {children}
    </div>
  );
}

interface MarketingNavLinkProps {
  href: string;
  label: string;
  className?: string;
}

export function MarketingNavLink({ href, label, className }: MarketingNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      data-active={isActive}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        motionClassNames.navLink,
        'relative cursor-pointer rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] inline-flex items-center',
        isActive && 'text-foreground font-medium',
        className
      )}
    >
      {label}
    </Link>
  );
}
