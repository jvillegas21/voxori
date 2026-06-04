import { describe, it, expect } from 'vitest';
import { PLAN_TIERS } from '../constants/plans';
import { VERTICALS } from '../constants/verticals';
import {
  DEFAULT_LAUNCH_MLS_MARKET,
  MLS_MARKET_IDS,
  resolveMlsMarket,
} from '../constants/mls-markets';

describe('PLAN_TIERS', () => {
  it('has exactly 4 tiers', () => {
    expect(Object.keys(PLAN_TIERS)).toHaveLength(4);
  });

  it('starter plan costs $149/month', () => {
    expect(PLAN_TIERS.starter.pricePerMonth).toBe(149);
  });

  it('professional plan costs $299/month', () => {
    expect(PLAN_TIERS.professional.pricePerMonth).toBe(299);
  });

  it('growth plan costs $499/month', () => {
    expect(PLAN_TIERS.growth.pricePerMonth).toBe(499);
  });

  it('agency plan costs $999/month', () => {
    expect(PLAN_TIERS.agency.pricePerMonth).toBe(999);
  });

  it('all tiers have includedMinutes > 0', () => {
    Object.values(PLAN_TIERS).forEach(tier => {
      expect(tier.includedMinutes).toBeGreaterThan(0);
    });
  });
});

describe('VERTICALS', () => {
  it('contains realtor vertical', () => {
    const keys = Object.keys(VERTICALS);
    expect(keys.some(k => k.toLowerCase().includes('realtor') || k.toLowerCase().includes('real_estate'))).toBe(true);
  });
});

describe('MLS_MARKETS', () => {
  it('defaults launch market to IDX Broker primary', () => {
    expect(DEFAULT_LAUNCH_MLS_MARKET.id).toBe(MLS_MARKET_IDS.IDX_BROKER_PRIMARY);
    expect(DEFAULT_LAUNCH_MLS_MARKET.provider).toBe('idx_broker');
    expect(DEFAULT_LAUNCH_MLS_MARKET.originatingSystemName).toBe('idx_broker');
  });

  it('keeps Austin legacy Bridge market', () => {
    const austin = resolveMlsMarket(MLS_MARKET_IDS.AUSTIN_CENTRAL_TEXAS);
    expect(austin.provider).toBe('bridge');
    expect(austin.bridgeMarketId).toBe('abor_ref');
  });

  it('includes CTXMLS market with Trestle provider', () => {
    const ctx = resolveMlsMarket(MLS_MARKET_IDS.CENTRAL_TEXAS_CTX);
    expect(ctx.provider).toBe('trestle');
    expect(ctx.originatingSystemName).toBe('ctxmls');
  });

  it('resolveMlsMarket falls back to launch market for unknown ids', () => {
    expect(resolveMlsMarket('unknown').id).toBe(MLS_MARKET_IDS.IDX_BROKER_PRIMARY);
  });

  it('launch market has default zip codes', () => {
    expect(DEFAULT_LAUNCH_MLS_MARKET.defaultZipCodes.length).toBeGreaterThan(0);
  });
});
