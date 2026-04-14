import { NextRequest, NextResponse } from 'next/server';

export function verifyAdminSecret(request: NextRequest) {
  const configuredSecret = process.env.ADMIN_API_SECRET;
  if (!configuredSecret) return null;

  const incomingSecret = request.headers.get('x-voxori-admin-secret');
  if (incomingSecret !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
