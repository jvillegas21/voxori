import { describe, it, expect } from 'vitest';
import {
  buildListingResultsMessage,
  parseSearchListingsEvent,
  planPostCallSmsDeliveries,
} from '../post-call-sms.service';

const sampleSearchOutput = {
  markets: [{ id: 'idx_broker_primary', displayName: 'Austin metro' }],
  listings: [
    {
      id: '1',
      address: '123 Main St, Austin',
      price: 425000,
      bedrooms: 3,
      bathrooms: 2,
      detailUrl: 'https://idx.example/listing/1',
    },
    {
      id: '2',
      address: '456 Oak Ave, Austin',
      price: 389000,
      bedrooms: 3,
      bathrooms: 2.5,
    },
    {
      id: '3',
      address: '789 Pine Rd, Austin',
      price: 510000,
      bedrooms: 4,
      bathrooms: 3,
      detail_url: 'https://idx.example/listing/3',
    },
  ],
};

describe('parseSearchListingsEvent', () => {
  it('extracts listings, criteria, and market label from tool event', () => {
    const parsed = parseSearchListingsEvent({
      input: { min_bedrooms: 3, max_price: 450000, zip_codes: ['78701'] },
      output: sampleSearchOutput,
    });

    expect(parsed.listings).toHaveLength(3);
    expect(parsed.listings[0]?.detailUrl).toBe('https://idx.example/listing/1');
    expect(parsed.listings[2]?.detailUrl).toBe('https://idx.example/listing/3');
    expect(parsed.minBedrooms).toBe(3);
    expect(parsed.maxPrice).toBe(450000);
    expect(parsed.areaLabel).toBe('Austin metro');
  });

  it('falls back to zip codes when market label missing', () => {
    const parsed = parseSearchListingsEvent({
      input: { min_bedrooms: 2, max_price: 500000, zip_codes: ['78701', '78702'] },
      output: { listings: sampleSearchOutput.listings.slice(0, 1) },
    });

    expect(parsed.areaLabel).toBe('78701, 78702');
  });
});

describe('buildListingResultsMessage', () => {
  it('formats top listings with TCPA footer', () => {
    const search = parseSearchListingsEvent({
      input: { min_bedrooms: 3, max_price: 450000 },
      output: sampleSearchOutput,
    });

    const body = buildListingResultsMessage({
      agentName: 'Jane Agent',
      search,
      maxListings: 3,
    });

    expect(body).toContain('Thanks for calling Jane Agent.');
    expect(body).toContain('3 homes matching your search (3+ bd, up to $450,000 in Austin metro):');
    expect(body).toContain('1. 123 Main St, Austin — $425,000 · 3bd/2ba');
    expect(body).toContain('   https://idx.example/listing/1');
    expect(body).toContain('2. 456 Oak Ave, Austin — $389,000 · 3bd/2.5ba');
    expect(body).not.toContain('https://idx.example/listing/2');
    expect(body).toContain('Reply STOP to opt out. Msg&data rates may apply.');
  });

  it('returns null when no listings', () => {
    const body = buildListingResultsMessage({
      agentName: 'Jane Agent',
      search: { listings: [], minBedrooms: null, maxPrice: null, areaLabel: null },
    });
    expect(body).toBeNull();
  });
});

describe('planPostCallSmsDeliveries', () => {
  it('merges summary and listings into one listing_results SMS when under limit', () => {
    const summary = 'Your showing is confirmed. Reply if you need anything else. — Voxori';
    const listings =
      buildListingResultsMessage({
        agentName: 'Jane Agent',
        search: parseSearchListingsEvent({
          input: { min_bedrooms: 3, max_price: 450000 },
          output: sampleSearchOutput,
        }),
      }) ?? '';

    const plan = planPostCallSmsDeliveries({
      summaryMessage: summary,
      listingMessage: listings,
      callId: 'call-1',
    });

    expect(plan).toHaveLength(1);
    expect(plan[0]?.smsType).toBe('listing_results');
    expect(plan[0]?.body).toContain(summary);
    expect(plan[0]?.body).toContain('123 Main St, Austin');
  });

  it('splits into post_call_summary and listing_results when combined exceeds 1600 chars', () => {
    const summary = 'Short summary.';
    const listings = `${'x'.repeat(1700)}\nReply STOP to opt out.`;

    const plan = planPostCallSmsDeliveries({
      summaryMessage: summary,
      listingMessage: listings,
      callId: 'call-2',
    });

    expect(plan).toHaveLength(2);
    expect(plan[0]?.smsType).toBe('post_call_summary');
    expect(plan[1]?.smsType).toBe('listing_results');
  });

  it('keeps post_call_summary only when no listing message', () => {
    const plan = planPostCallSmsDeliveries({
      summaryMessage: 'Thanks for calling.',
      listingMessage: null,
      callId: 'call-3',
    });

    expect(plan).toEqual([
      {
        smsType: 'post_call_summary',
        body: 'Thanks for calling.',
        idempotencyKey: 'post_call:call-3',
      },
    ]);
  });
});

describe('buyer tool chain SMS payload (mocked search_listings event)', () => {
  it('produces doc §8 example shape from Vapi tool output', () => {
    const event = {
      input: { min_bedrooms: 3, max_price: 450000, zip_codes: ['78701'] },
      output: {
        listings: [
          {
            address: '123 Main St, Austin',
            price: 425000,
            bedrooms: 3,
            bathrooms: 2,
            detailUrl: 'https://idx.example/123-main',
          },
        ],
        markets: [{ displayName: 'Austin' }],
      },
    };

    const message = buildListingResultsMessage({
      agentName: 'Alex Rivera',
      search: parseSearchListingsEvent(event),
    });

    expect(message).toContain(
      'Thanks for calling Alex Rivera. Here are 1 homes matching your search (3+ bd, up to $450,000 in Austin):'
    );
    expect(message).toContain('1. 123 Main St, Austin — $425,000 · 3bd/2ba');
    expect(message).toContain('https://idx.example/123-main');
    expect(message).toContain('Reply STOP to opt out. Msg&data rates may apply.');
  });
});
