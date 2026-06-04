import { describe, it, expect } from 'vitest';
import { resolveZipCodesFromArea } from '../city-zip-resolver';

describe('resolveZipCodesFromArea', () => {
  it('passes through a 5-digit ZIP', () => {
    expect(resolveZipCodesFromArea('78704')).toEqual(['78704']);
  });

  it('expands Austin to metro ZIP clusters', () => {
    const zips = resolveZipCodesFromArea('Austin');
    expect(zips).toContain('78701');
    expect(zips).toContain('78704');
    expect(zips).toContain('78751');
    expect(zips.length).toBeGreaterThan(10);
  });

  it('extracts embedded ZIP from free-text area', () => {
    expect(resolveZipCodesFromArea('South Austin, 78704')).toEqual(['78704']);
  });

  it('maps Round Rock to its ZIP cluster', () => {
    expect(resolveZipCodesFromArea('Round Rock')).toEqual(['78664', '78665', '78681']);
  });

  it('matches partial city phrases', () => {
    expect(resolveZipCodesFromArea('north austin area')).toEqual(['78758', '78759', '78753']);
  });

  it('returns empty array for unknown areas', () => {
    expect(resolveZipCodesFromArea('Denver')).toEqual([]);
  });

  it('returns empty array for blank input', () => {
    expect(resolveZipCodesFromArea('   ')).toEqual([]);
  });
});
