'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RevealOnScroll } from '@/components/marketing/motion';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'waitlist_page' }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Unable to join waitlist');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 fade-in-page">
      <RevealOnScroll className="w-full max-w-md text-center">
        <Link
          href="/landing"
          className="font-heading text-xl font-semibold text-primary transition-opacity duration-200 hover:opacity-80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Voxori
        </Link>
        <h1 className="font-heading mt-8 text-3xl font-semibold text-foreground">
          Join the waitlist
        </h1>
        <p className="mt-3 text-muted-foreground">
          Be first to know when we open public beta in your market.
        </p>

        {submitted ? (
          <p
            className="mt-8 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground transition-interactive"
            role="status"
          >
            Thanks — we&apos;ll be in touch when your market opens.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'waitlist-error' : undefined}
                className={cn(
                  'input-focus-ring mt-1 flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base',
                  error && 'error-shake'
                )}
                placeholder="you@brokerage.com"
              />
            </div>
            {error && (
              <p id="waitlist-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="cta-primary w-full cursor-pointer min-h-[44px]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
                  Joining…
                </>
              ) : (
                'Join waitlist'
              )}
            </Button>
          </form>
        )}
      </RevealOnScroll>
    </div>
  );
}
