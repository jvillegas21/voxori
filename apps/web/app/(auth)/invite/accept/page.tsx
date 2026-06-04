'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing invitation token. Open the link from your invite email.');
      return;
    }

    async function accept() {
      setStatus('working');
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setStatus('idle');
        setMessage('Sign in with the email that received the invite, then return to this page.');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invites/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(body.error ?? 'Could not accept invitation.');
        return;
      }

      setStatus('done');
      setMessage('You have joined the workspace. Redirecting…');
      router.replace('/');
      router.refresh();
    }

    void accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when token is present
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Accept invitation</h1>
        {status === 'working' && (
          <p className="text-sm text-muted-foreground">Linking your account to the workspace…</p>
        )}
        {message && (
          <p
            className={
              status === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'
            }
          >
            {message}
          </p>
        )}
        {status === 'idle' && token && (
          <Link
            href={`/sign-in?next=${encodeURIComponent(`/invite/accept?token=${token}`)}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Sign in to continue
          </Link>
        )}
        {status === 'error' && (
          <Link href="/sign-in" className="text-sm underline underline-offset-4">
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  );
}
