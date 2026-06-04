import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import {
  authenticateToolRequest,
  logToolExecution,
  parseToolJsonBody,
} from '../../../lib/services/tool-route-helper';
import { createCalendarEvent } from '../../../lib/services/google-calendar.service';

interface BookShowingParams {
  date: string;
  time: string;
  listing_address: string;
  caller_name: string;
  caller_phone: string;
  duration_minutes?: number;
  callId?: string;
  call_id?: string;
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  const auth = await authenticateToolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseToolJsonBody<BookShowingParams>(request);
  if (parsed instanceof NextResponse) return parsed;
  const { body, callId } = parsed;
  const { date, time, listing_address, caller_name, caller_phone, duration_minutes } = body;

  const db = createServiceRoleClient();
  const { error } = await db.from('bookings').insert({
    tenant_id: auth.tenantId,
    agent_id: auth.agentId,
    contact_name: caller_name,
    contact_phone: caller_phone,
    showing_address: listing_address,
    scheduled_at: new Date(`${date}T${time}`).toISOString(),
    status: 'pending',
  });

  if (error) {
    const failure = {
      success: false,
      message: 'Failed to book showing. Please try again.',
    };
    void logToolExecution({
      request,
      auth,
      toolName: 'book-showing',
      callId,
      body: body as unknown as Record<string, unknown>,
      input: body as unknown as Record<string, unknown>,
      output: failure,
      durationMs: Date.now() - started,
      status: 'error',
    });
    return NextResponse.json(failure);
  }

  const calendar = await createCalendarEvent(db, auth.tenantId, {
    date,
    time,
    durationMinutes: duration_minutes,
    summary: `Showing: ${listing_address}`,
    description: `Contact: ${caller_name} (${caller_phone})`,
    attendeePhone: caller_phone,
  });

  const response = {
    success: true,
    calendar_event_id: calendar.eventId,
    calendar_source: calendar.source,
    message: `Showing booked for ${date} at ${time} at ${listing_address}. A confirmation will be sent to ${caller_phone}.`,
  };

  void logToolExecution({
    request,
    auth,
    toolName: 'book-showing',
    callId,
    body: body as unknown as Record<string, unknown>,
    input: body as unknown as Record<string, unknown>,
    output: response,
    durationMs: Date.now() - started,
  });

  return NextResponse.json(response);
}
