import { NextRequest } from 'next/server';

/** Validates cron callers: manual POST (header) or Vercel Cron GET (Bearer). */
export function authorizeCron(request: NextRequest): boolean {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  if (!internalSecret && !cronSecret) return false;

  if (internalSecret && request.headers.get('x-voxori-internal-secret') === internalSecret) {
    return true;
  }

  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;

  const token = auth.slice('Bearer '.length);
  if (cronSecret && token === cronSecret) return true;
  if (internalSecret && token === internalSecret) return true;

  return false;
}
