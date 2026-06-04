import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import {
  authenticateToolRequest,
  logToolExecution,
  parseToolJsonBody,
} from '../../../lib/services/tool-route-helper';
import { checkCalendarAvailability } from '../../../lib/services/google-calendar.service';

interface CheckAvailabilityParams {
  date: string;
  time: string;
  duration_minutes?: number;
  callId?: string;
  call_id?: string;
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  const auth = await authenticateToolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseToolJsonBody<CheckAvailabilityParams>(request);
  if (parsed instanceof NextResponse) return parsed;
  const { body, callId } = parsed;
  const { date, time, duration_minutes } = body;

  const db = createServiceRoleClient();
  const { available, source } = await checkCalendarAvailability(
    db,
    auth.tenantId,
    date,
    time,
    duration_minutes ?? 30
  );

  const response = {
    available,
    source,
    message: available
      ? `${date} at ${time} is available for a ${duration_minutes ?? 30}-minute appointment. Would you like me to book it?`
      : `${date} at ${time} is not available. Please suggest another time.`,
  };

  void logToolExecution({
    request,
    auth,
    toolName: 'check-availability',
    callId,
    body: body as unknown as Record<string, unknown>,
    input: body as unknown as Record<string, unknown>,
    output: response,
    durationMs: Date.now() - started,
  });

  return NextResponse.json(response);
}
