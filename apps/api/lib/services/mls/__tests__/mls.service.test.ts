import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MLS_MARKET_IDS, resolveMlsMarket } from '@voxori/shared/constants';
import { buildBridgePropertyUrl } from '../bridge.provider';
import {
  IDX_BROKER_FEATURED_PATH,
  buildIdxSearchQuery,
  fetchIdxBrokerListings,
  resolveIdxBrokerCredentials,
} from '../idx-broker.provider';
import { dedupeListings, integrationMarketId, integrationProvider } from '../types';

describe('MLS market config', () => {
  it('defaults primary market to IDX Broker', () => {
    const market = resolveMlsMarket(MLS_MARKET_IDS.IDX_BROKER_PRIMARY);
    expect(market.provider).toBe('idx_broker');
    expect(market.originatingSystemName).toBe('idx_broker');
  });

  it('maps Austin market to Bridge abor_ref / unlock', () => {
    const market = resolveMlsMarket(MLS_MARKET_IDS.AUSTIN_CENTRAL_TEXAS);
    expect(market.provider).toBe('bridge');
    expect(market.bridgeMarketId).toBe('abor_ref');
    expect(market.originatingSystemName).toBe('unlock');
  });

  it('maps CTX market to Trestle', () => {
    const market = resolveMlsMarket(MLS_MARKET_IDS.CENTRAL_TEXAS_CTX);
    expect(market.provider).toBe('trestle');
    expect(market.originatingSystemName).toBe('ctxmls');
    expect(market.trestleMloId).toBe('CTX');
  });
});

describe('buildBridgePropertyUrl', () => {
  it('includes dataset segment in Bridge URL', () => {
    const market = resolveMlsMarket(MLS_MARKET_IDS.AUSTIN_CENTRAL_TEXAS);
    const url = buildBridgePropertyUrl(market);
    expect(url).toContain('/abor_ref/Property');
  });
});

describe('integrationMarketId', () => {
  it('prefers market_id column over config', () => {
    expect(
      integrationMarketId({
        id: '1',
        credentials: null,
        config: { market_id: 'central_texas_ctx' },
        market_id: 'austin_central_texas',
      })
    ).toBe('austin_central_texas');
  });
});

describe('dedupeListings', () => {
  it('dedupes by mls_id within originating system', () => {
    const listings = dedupeListings([
      {
        id: '1',
        mls_id: 'A1',
        address: '100 Main St',
        price: 100,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1000,
        status: 'active',
        originating_system_name: 'unlock',
        market_id: 'austin_central_texas',
        source: 'cache',
      },
      {
        id: '2',
        mls_id: 'A1',
        address: '100 Main St',
        price: 100,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1000,
        status: 'active',
        originating_system_name: 'unlock',
        market_id: 'austin_central_texas',
        source: 'bridge',
      },
    ]);

    expect(listings).toHaveLength(1);
  });

  it('keeps same mls_id across different originating systems', () => {
    const listings = dedupeListings([
      {
        id: '1',
        mls_id: '1001',
        address: '100 Main St, Austin',
        price: 100,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1000,
        status: 'active',
        originating_system_name: 'unlock',
        market_id: 'austin_central_texas',
        source: 'bridge',
      },
      {
        id: '2',
        mls_id: '1001',
        address: '200 Oak Ave, Temple',
        price: 200,
        bedrooms: 4,
        bathrooms: 2,
        sqft: 1500,
        status: 'active',
        originating_system_name: 'ctxmls',
        market_id: 'central_texas_ctx',
        source: 'trestle',
      },
    ]);

    expect(listings).toHaveLength(2);
  });
});

describe('integrationProvider', () => {
  it('reads provider from integration config when set', () => {
    expect(
      integrationProvider({
        id: '1',
        credentials: null,
        config: { provider: 'idx_broker', market_id: 'austin_central_texas' },
        market_id: 'austin_central_texas',
      })
    ).toBe('idx_broker');
  });
});

describe('resolveIdxBrokerCredentials', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('prefers valid tenant api_key over platform env', () => {
    process.env = { ...originalEnv, IDX_BROKER_API_KEY: 'platformkeyabcdefghijklmnopqrst' };
    const creds = resolveIdxBrokerCredentials({
      api_key: 'tenantkeyabcdefghijklmnopqrst',
    });
    expect(creds?.api_key).toBe('tenantkeyabcdefghijklmnopqrst');
  });

  it('falls back to platform env when tenant key is invalid placeholder', () => {
    process.env = { ...originalEnv, IDX_BROKER_API_KEY: 'platformkeyabcdefghijklmnopqrst' };
    const creds = resolveIdxBrokerCredentials({ api_key: 'run pnpm db:migrate' });
    expect(creds?.api_key).toBe('platformkeyabcdefghijklmnopqrst');
  });

  it('uses platform env for mode platform credentials', () => {
    process.env = { ...originalEnv, IDX_BROKER_API_KEY: 'platformkeyabcdefghijklmnopqrst' };
    const creds = resolveIdxBrokerCredentials({ mode: 'platform', api_key: 'short' });
    expect(creds?.api_key).toBe('platformkeyabcdefghijklmnopqrst');
  });

  it('returns null when no credentials available', () => {
    process.env = { ...originalEnv };
    delete process.env.IDX_BROKER_API_KEY;
    delete process.env.IDX_BROKER_DEFAULT_API_KEY;
    expect(resolveIdxBrokerCredentials({})).toBeNull();
  });
});

describe('buildIdxSearchQuery', () => {
  it('includes bedroom and price filters', () => {
    const market = resolveMlsMarket(MLS_MARKET_IDS.IDX_BROKER_PRIMARY);
    const query = buildIdxSearchQuery(market, {
      tenantId: 't1',
      minBedrooms: 3,
      maxPrice: 500000,
      zipCodes: ['78701'],
    });
    expect(query).toContain('bd=3');
    expect(query).toContain('hp=500000');
    expect(query).toContain('zipcode=78701');
  });

  it('includes min baths and min price filters', () => {
    const market = resolveMlsMarket(MLS_MARKET_IDS.IDX_BROKER_PRIMARY);
    const query = buildIdxSearchQuery(market, {
      tenantId: 't1',
      minBathrooms: 2,
      minPrice: 300000,
      zipCodes: ['78702', '78703'],
    });
    expect(query).toContain('tb=2');
    expect(query).toContain('amin_bathrooms=2');
    expect(query).toContain('lp=300000');
    expect(query).toContain('amin_listingPrice=300000');
    expect(query).toContain('aw_zipcode[]=78702');
    expect(query).toContain('aw_zipcode[]=78703');
  });
});

describe('fetchIdxBrokerListings', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total: 10,
          first: 'https://example.idxbroker.com/listing/IDX-1',
          data: {
            'e188!%604976': {
              listingID: 'IDX-1',
              idxID: 'e188',
              address: '100 Main St, Austin, TX 78701',
              zipcode: '78701',
              listingPrice: 425000,
              bedrooms: 3,
              totalBaths: 2,
              sqFt: 1800,
              idxStatus: 'active',
            },
          },
        }),
      })
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('calls IDX Broker featured endpoint with accesskey header', async () => {
    const market = resolveMlsMarket(MLS_MARKET_IDS.IDX_BROKER_PRIMARY);
    const results = await fetchIdxBrokerListings(market, { tenantId: 't1', limit: 5 }, {
      api_key: 'test-idx-key-1234567890ab',
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.source).toBe('idx_broker');
    expect(results[0]?.mls_id).toBe('e188-IDX-1');
    expect(results[0]?.zipcode).toBe('78701');
    expect(results[0]?.detailUrl).toBe('https://example.idxbroker.com/listing/IDX-1');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(IDX_BROKER_FEATURED_PATH),
      expect.objectContaining({
        headers: expect.objectContaining({ accesskey: 'test-idx-key-1234567890ab' }),
      })
    );
  });

  it('returns featured listings outside default market ZIPs when skipGeoFilter is set', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            'e188!%604976': {
              listingID: 'IDX-2',
              idxID: 'e188',
              address: '500 Ocean Dr, Miami, FL 33139',
              zipcode: '33139',
              listingPrice: 900000,
              bedrooms: 2,
              totalBaths: 2,
              sqFt: 1200,
              idxStatus: 'active',
            },
          },
        }),
      })
    );

    const market = resolveMlsMarket(MLS_MARKET_IDS.IDX_BROKER_PRIMARY);
    const results = await fetchIdxBrokerListings(
      market,
      { tenantId: 't1', limit: 5, skipGeoFilter: true },
      { api_key: 'test-idx-key-1234567890ab' }
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.zipcode).toBe('33139');
  });

  it('filters featured listings to default market ZIPs without skipGeoFilter', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            'e188!%604976': {
              listingID: 'IDX-2',
              idxID: 'e188',
              address: '500 Ocean Dr, Miami, FL 33139',
              zipcode: '33139',
              listingPrice: 900000,
              bedrooms: 2,
              totalBaths: 2,
              sqFt: 1200,
              idxStatus: 'active',
            },
          },
        }),
      })
    );

    const market = resolveMlsMarket(MLS_MARKET_IDS.IDX_BROKER_PRIMARY);
    const results = await fetchIdxBrokerListings(
      market,
      { tenantId: 't1', limit: 5 },
      { api_key: 'test-idx-key-1234567890ab' }
    );

    expect(results).toHaveLength(0);
  });
});

describe('fetchBridgeListings', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, BRIDGE_SERVER_TOKEN: 'test-token' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          value: [
            {
              ListingKey: 'BR-1',
              UnparsedAddress: '1 Bridge Ln',
              ListPrice: 400000,
              BedroomsTotal: 3,
              BathroomsTotalInteger: 2,
              LivingArea: 1500,
              StandardStatus: 'Active',
            },
          ],
        }),
      })
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('calls Bridge with dataset-scoped Property endpoint', async () => {
    const { fetchBridgeListings } = await import('../bridge.provider');
    const market = resolveMlsMarket(MLS_MARKET_IDS.AUSTIN_CENTRAL_TEXAS);
    const results = await fetchBridgeListings(market, { tenantId: 't1', limit: 5 });

    expect(results).toHaveLength(1);
    expect(results[0]?.originating_system_name).toBe('unlock');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/abor_ref/Property'),
      expect.any(Object)
    );
  });
});
