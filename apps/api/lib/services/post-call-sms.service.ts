import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@voxori/database';
import twilio from 'twilio';
import { resolveTenantSmsFromNumber } from './tenant-sms.service';

type Db = SupabaseClient<Database>;

const POST_CALL_SMS_TYPE = 'post_call_summary';
const LISTING_RESULTS_SMS_TYPE = 'listing_results';
const SMS_MERGE_MAX_CHARS = 1600;
const LISTING_SMS_MAX_RESULTS = 5;
const SEARCH_EVENT_MAX_AGE_MS = 15 * 60 * 1000;

export interface PostCallSmsContext {
  tenantId: string;
  callId: string;
}

export interface ListingSmsItem {
  address: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  detailUrl?: string | null;
}

export interface SearchListingsEventData {
  listings: ListingSmsItem[];
  minBedrooms: number | null;
  maxPrice: number | null;
  areaLabel: string | null;
}

export interface PlannedSmsDelivery {
  smsType: string;
  body: string;
  idempotencyKey: string;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function phonesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatBedsBaths(
  bedrooms: number | null,
  bathrooms: number | null
): string | null {
  const parts: string[] = [];
  if (bedrooms != null) parts.push(`${bedrooms}bd`);
  if (bathrooms != null) parts.push(`${Math.round(bathrooms * 10) / 10}ba`);
  return parts.length > 0 ? parts.join('/') : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function listingFromRecord(raw: unknown): ListingSmsItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const address = readString(record.address);
  if (!address) return null;

  return {
    address,
    price: readNumber(record.price),
    bedrooms: readNumber(record.bedrooms),
    bathrooms: readNumber(record.bathrooms),
    detailUrl: readString(record.detailUrl ?? record.detail_url),
  };
}

/** Parse latest successful search_listings tool event input/output. */
export function parseSearchListingsEvent(event: {
  input: unknown;
  output: unknown;
}): SearchListingsEventData {
  const input = (event.input ?? {}) as Record<string, unknown>;
  const output = (event.output ?? {}) as Record<string, unknown>;

  const rawListings = Array.isArray(output.listings) ? output.listings : [];
  const listings = rawListings
    .map(listingFromRecord)
    .filter((listing): listing is ListingSmsItem => listing !== null);

  const markets = Array.isArray(output.markets) ? output.markets : [];
  const marketLabel =
    markets
      .map((market) => {
        if (!market || typeof market !== 'object') return null;
        return readString((market as Record<string, unknown>).displayName);
      })
      .find(Boolean) ?? null;

  const zipCodes = Array.isArray(input.zip_codes)
    ? input.zip_codes.filter((z): z is string => typeof z === 'string' && z.trim().length > 0)
    : [];

  const areaLabel =
    marketLabel ??
    (zipCodes.length > 0 ? zipCodes.slice(0, 3).join(', ') : null);

  return {
    listings,
    minBedrooms: readNumber(input.min_bedrooms),
    maxPrice: readNumber(input.max_price),
    areaLabel,
  };
}

/** Build listing_results SMS body per VAPI_IDX_BUYER_FLOW.md §8. */
export function buildListingResultsMessage(params: {
  agentName: string;
  search: SearchListingsEventData;
  maxListings?: number;
}): string | null {
  const maxListings = params.maxListings ?? LISTING_SMS_MAX_RESULTS;
  const listings = params.search.listings.slice(0, maxListings);
  if (listings.length === 0) return null;

  const criteriaParts: string[] = [];
  if (params.search.minBedrooms != null) {
    criteriaParts.push(`${params.search.minBedrooms}+ bd`);
  }

  let priceAreaPart = '';
  if (params.search.maxPrice != null && params.search.areaLabel) {
    priceAreaPart = `up to ${formatUsd(params.search.maxPrice)} in ${params.search.areaLabel}`;
  } else if (params.search.maxPrice != null) {
    priceAreaPart = `up to ${formatUsd(params.search.maxPrice)}`;
  } else if (params.search.areaLabel) {
    priceAreaPart = `in ${params.search.areaLabel}`;
  }
  if (priceAreaPart) criteriaParts.push(priceAreaPart);

  const criteriaSuffix =
    criteriaParts.length > 0 ? ` (${criteriaParts.join(', ')})` : '';

  const lines: string[] = [
    `Thanks for calling ${params.agentName}. Here are ${listings.length} homes matching your search${criteriaSuffix}:`,
    '',
  ];

  listings.forEach((listing, index) => {
    const priceLabel =
      listing.price != null ? formatUsd(listing.price) : 'Price TBD';
    const bedsBaths = formatBedsBaths(listing.bedrooms, listing.bathrooms);
    const suffix = bedsBaths ? ` · ${bedsBaths}` : '';
    lines.push(`${index + 1}. ${listing.address} — ${priceLabel}${suffix}`);
    if (listing.detailUrl) {
      lines.push(`   ${listing.detailUrl}`);
    }
  });

  lines.push('');
  lines.push('Reply STOP to opt out. Msg&data rates may apply.');
  return lines.join('\n');
}

/**
 * Merge strategy: one SMS when summary + listings fit in 1600 chars (TCPA-friendly
 * single follow-up); otherwise send post_call_summary first, then listing_results.
 */
export function planPostCallSmsDeliveries(params: {
  summaryMessage: string;
  listingMessage: string | null;
  callId: string;
}): PlannedSmsDelivery[] {
  if (!params.listingMessage?.trim()) {
    return [
      {
        smsType: POST_CALL_SMS_TYPE,
        body: params.summaryMessage,
        idempotencyKey: `post_call:${params.callId}`,
      },
    ];
  }

  const combined = `${params.summaryMessage}\n\n${params.listingMessage}`;
  if (combined.length <= SMS_MERGE_MAX_CHARS) {
    return [
      {
        smsType: LISTING_RESULTS_SMS_TYPE,
        body: combined,
        idempotencyKey: `listing_results:${params.callId}`,
      },
    ];
  }

  return [
    {
      smsType: POST_CALL_SMS_TYPE,
      body: params.summaryMessage,
      idempotencyKey: `post_call:${params.callId}`,
    },
    {
      smsType: LISTING_RESULTS_SMS_TYPE,
      body: params.listingMessage,
      idempotencyKey: `listing_results:${params.callId}`,
    },
  ];
}

function buildPostCallMessage(params: {
  summary: string | null;
  toolHighlights: string[];
  bookingLine: string | null;
}): string {
  const parts: string[] = [];
  if (params.bookingLine) parts.push(params.bookingLine);
  if (params.summary?.trim()) parts.push(params.summary.trim());
  if (params.toolHighlights.length > 0) {
    parts.push(`Recent actions: ${params.toolHighlights.join('; ')}.`);
  }
  if (parts.length === 0) {
    return 'Thanks for calling. Our team will follow up with you shortly. — Voxori';
  }
  return `${parts.join(' ')} Reply if you need anything else. — Voxori`;
}

async function loadLatestSearchListingsEvent(db: Db, callId: string) {
  const since = new Date(Date.now() - SEARCH_EVENT_MAX_AGE_MS).toISOString();
  const { data } = await db
    .from('call_tool_events')
    .select('input, output, status, created_at')
    .eq('call_id', callId)
    .eq('tool_name', 'search_listings')
    .neq('status', 'error')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

async function loadCallContext(db: Db, ctx: PostCallSmsContext) {
  const { data: call } = await db
    .from('calls')
    .select('id, tenant_id, agent_id, caller_number, summary, consent_given')
    .eq('id', ctx.callId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();

  if (!call) return null;

  const [{ data: toolEvents }, { data: agent }, searchEvent] = await Promise.all([
    db
      .from('call_tool_events')
      .select('tool_name, output, status')
      .eq('call_id', ctx.callId)
      .order('created_at', { ascending: false })
      .limit(5),
    call.agent_id
      ? db.from('agents').select('name').eq('id', call.agent_id).maybeSingle()
      : Promise.resolve({ data: null }),
    loadLatestSearchListingsEvent(db, ctx.callId),
  ]);

  const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { data: bookings } = await db
    .from('bookings')
    .select('contact_name, contact_phone, showing_address, scheduled_at, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('agent_id', call.agent_id)
    .gte('scheduled_at', new Date().toISOString())
    .gte('created_at', since)
    .neq('status', 'cancelled')
    .order('scheduled_at', { ascending: true })
    .limit(10);

  const booking = (bookings ?? []).find((b) =>
    phonesMatch(call.caller_number, b.contact_phone)
  );

  return {
    call,
    toolEvents: toolEvents ?? [],
    booking: booking ?? null,
    agentName: agent?.name?.trim() || 'your agent',
    searchEvent,
  };
}

function toolHighlightsFromEvents(
  events: Array<{ tool_name: string; output: unknown; status: string | null }>
): string[] {
  return events
    .filter((e) => e.status !== 'error')
    .map((e) => {
      const name = e.tool_name.replace(/_/g, ' ');
      const out = e.output as Record<string, unknown> | null;
      if (e.tool_name === 'book_showing' && out?.success) return 'showing booked';
      if (e.tool_name === 'log_lead' && out?.logged) return 'lead saved';
      if (e.tool_name === 'search_listings') return 'listings shared';
      return name;
    })
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 3);
}

async function outboxAlreadySent(
  db: Db,
  callId: string,
  smsType: string
): Promise<boolean> {
  const { data } = await db
    .from('sms_outbox')
    .select('status')
    .eq('call_id', callId)
    .eq('sms_type', smsType)
    .maybeSingle();

  return data?.status === 'sent';
}

async function sendSmsDelivery(
  db: Db,
  ctx: PostCallSmsContext,
  toPhone: string,
  fromNumber: string,
  delivery: PlannedSmsDelivery,
  twilioClient: ReturnType<typeof twilio>
): Promise<{ sent: boolean; reason: string }> {
  if (await outboxAlreadySent(db, ctx.callId, delivery.smsType)) {
    return { sent: false, reason: 'already_sent' };
  }

  try {
    const twilioMessage = await twilioClient.messages.create({
      body: delivery.body,
      from: fromNumber,
      to: toPhone,
    });

    await db.from('sms_outbox').upsert(
      {
        tenant_id: ctx.tenantId,
        call_id: ctx.callId,
        sms_type: delivery.smsType,
        to_phone: toPhone,
        body: delivery.body,
        status: 'sent',
        twilio_sid: twilioMessage.sid,
        idempotency_key: delivery.idempotencyKey,
        sent_at: new Date().toISOString(),
        error_message: null,
      },
      { onConflict: 'call_id,sms_type' }
    );

    console.log('[post-call-sms] sent', {
      callId: ctx.callId,
      smsType: delivery.smsType,
      sid: twilioMessage.sid,
    });
    return { sent: true, reason: 'sent' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[post-call-sms] send failed', {
      callId: ctx.callId,
      smsType: delivery.smsType,
      err,
    });

    await db.from('sms_outbox').upsert(
      {
        tenant_id: ctx.tenantId,
        call_id: ctx.callId,
        sms_type: delivery.smsType,
        to_phone: toPhone,
        body: delivery.body,
        status: 'failed',
        idempotency_key: delivery.idempotencyKey,
        error_message: errorMessage,
      },
      { onConflict: 'call_id,sms_type' }
    );

    return { sent: false, reason: 'twilio_error' };
  }
}

export async function processPostCallSms(
  db: Db,
  ctx: PostCallSmsContext
): Promise<{ sent: boolean; reason: string }> {
  const loaded = await loadCallContext(db, ctx);
  if (!loaded) return { sent: false, reason: 'call_not_found' };

  const { call, toolEvents, booking, agentName, searchEvent } = loaded;

  if (!call.caller_number) return { sent: false, reason: 'no_caller_number' };
  if (!call.consent_given) return { sent: false, reason: 'consent_not_given' };

  const toPhone = booking?.contact_phone ?? call.caller_number;
  const bookingLine =
    booking?.showing_address && booking.scheduled_at
      ? `Your showing at ${booking.showing_address} is scheduled for ${new Date(booking.scheduled_at).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}.`
      : null;

  const summaryMessage = buildPostCallMessage({
    summary: call.summary,
    toolHighlights: toolHighlightsFromEvents(toolEvents),
    bookingLine,
  });

  const listingMessage = searchEvent
    ? buildListingResultsMessage({
        agentName,
        search: parseSearchListingsEvent(searchEvent),
      })
    : null;

  const deliveries = planPostCallSmsDeliveries({
    summaryMessage,
    listingMessage,
    callId: ctx.callId,
  });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = await resolveTenantSmsFromNumber(db, ctx.tenantId);

  if (!accountSid || !authToken || !fromNumber) {
    console.log('[post-call-sms] dev skip — Twilio not configured', {
      callId: ctx.callId,
      to: toPhone,
      preview: deliveries.map((d) => d.body.slice(0, 80)),
    });
    return { sent: false, reason: 'twilio_not_configured' };
  }

  const twilioClient = twilio(accountSid, authToken);
  let sentAny = false;
  let lastReason = 'already_sent';

  for (const delivery of deliveries) {
    const outcome = await sendSmsDelivery(
      db,
      ctx,
      toPhone,
      fromNumber,
      delivery,
      twilioClient
    );
    if (outcome.sent) sentAny = true;
    lastReason = outcome.reason;
  }

  return sentAny
    ? { sent: true, reason: 'sent' }
    : { sent: false, reason: lastReason };
}

export async function retryPendingSmsOutbox(
  db: Db,
  options: { limit?: number } = {}
): Promise<Array<{ id: string; sent: boolean; reason: string }>> {
  const limit = options.limit ?? 50;
  const { data: rows } = await db
    .from('sms_outbox')
    .select('id, tenant_id, call_id, sms_type, status')
    .in('status', ['pending', 'failed'])
    .in('sms_type', [POST_CALL_SMS_TYPE, LISTING_RESULTS_SMS_TYPE])
    .order('created_at', { ascending: true })
    .limit(limit);

  const results: Array<{ id: string; sent: boolean; reason: string }> = [];

  for (const row of rows ?? []) {
    if (!row.call_id) {
      results.push({ id: row.id, sent: false, reason: 'missing_call_id' });
      continue;
    }
    const outcome = await processPostCallSms(db, {
      tenantId: row.tenant_id,
      callId: row.call_id,
    });
    results.push({ id: row.id, sent: outcome.sent, reason: outcome.reason });
  }

  return results;
}

/** @deprecated Use processPostCallSms via internal dispatch */
export async function sendPostCallConfirmationIfApplicable(
  db: Db,
  ctx: PostCallSmsContext & { agentId: string; callerNumber: string | null }
): Promise<{ sent: boolean; reason: string }> {
  return processPostCallSms(db, { tenantId: ctx.tenantId, callId: ctx.callId });
}
