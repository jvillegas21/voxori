import { describe, it, expect } from 'vitest';
import { PLAN_TIERS } from '../constants/plans';
import { VERTICALS } from '../constants/verticals';

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
