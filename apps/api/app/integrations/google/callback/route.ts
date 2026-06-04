import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import { exchangeGoogleCode } from '../../../../lib/services/google-calendar.service';
import { markStepComplete } from '../../../../lib/services/onboarding.service';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const onboardingCalendar = `${appUrl}/onboarding?step=calendar`;

  if (!code || !state) {
    return NextResponse.redirect(
      `${onboardingCalendar}&error=${encodeURIComponent('missing_oauth_params')}`
    );
  }

  const db = createServiceRoleClient();
  const result = await exchangeGoogleCode(db, code, state);

  if ('error' in result) {
    return NextResponse.redirect(
      `${onboardingCalendar}&error=${encodeURIComponent(result.error)}`
    );
  }

  await markStepComplete(db, result.tenantId, 'calendar');

  return NextResponse.redirect(`${onboardingCalendar}&connected=1`);
}
