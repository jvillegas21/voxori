'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { makeTrpcClient } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

interface PricingCheckoutButtonProps {
  plan?: 'starter' | 'professional' | 'growth' | 'agency';
  variant?: 'default' | 'outline';
  className?: string;
  children: React.ReactNode;
  signedOutHref?: string;
}

export function PricingCheckoutButton({
  plan = 'starter',
  variant = 'default',
  className,
  children,
  signedOutHref = '/sign-up',
}: PricingCheckoutButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [checkoutPending, setCheckoutPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setSession(data.session);
        setSessionLoading(false);
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!cancelled) {
        setSession(nextSession);
        setSessionLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function startCheckout() {
    if (!session?.access_token) return;

    setMessage(null);
    setCheckoutPending(true);

    try {
      const client = makeTrpcClient(session.access_token);
      const { url } = await client.billing.createCheckoutSession.mutate({ plan });
      window.location.href = url;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setCheckoutPending(false);
    }
  }

  if (sessionLoading) {
    return (
      <Button variant={variant} className={className} disabled>
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
        Loading…
      </Button>
    );
  }

  if (!session) {
    return (
      <Button
        variant={variant}
        className={`cursor-pointer transition-interactive ${variant === 'default' ? 'cta-primary' : ''} ${className ?? ''}`}
        asChild
      >
        <Link href={signedOutHref}>{children}</Link>
      </Button>
    );
  }

  return (
    <div className="w-full">
      <Button
        type="button"
        variant={variant}
        className={`w-full cursor-pointer min-h-[44px] transition-interactive ${variant === 'default' ? 'cta-primary' : ''} ${className ?? ''}`}
        disabled={checkoutPending}
        onClick={() => void startCheckout()}
      >
        {checkoutPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Redirecting…
          </>
        ) : (
          children
        )}
      </Button>
      {message && (
        <p className="mt-2 text-center text-xs text-destructive" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
