/**
 * Static city → ZIP resolver for voice search (P0).
 * Voice callers say "Austin" but IDX Broker queries require ZIP codes.
 * P1: replace with IDX `mls/cities` API lookup.
 */

const FIVE_DIGIT_ZIP = /^\d{5}$/;

/** Austin metro core + surrounding clusters (ABOR design partner). */
const AUSTIN_METRO_ZIPS = [
  '78701',
  '78702',
  '78703',
  '78704',
  '78705',
  '78721',
  '78722',
  '78723',
  '78724',
  '78725',
  '78726',
  '78727',
  '78728',
  '78729',
  '78731',
  '78732',
  '78733',
  '78734',
  '78735',
  '78736',
  '78737',
  '78738',
  '78739',
  '78741',
  '78742',
  '78744',
  '78745',
  '78746',
  '78747',
  '78748',
  '78749',
  '78750',
  '78751',
  '78752',
  '78753',
  '78754',
  '78756',
  '78757',
  '78758',
  '78759',
] as const;

const CITY_ZIP_MAP: Record<string, readonly string[]> = {
  austin: AUSTIN_METRO_ZIPS,
  'round rock': ['78664', '78665', '78681'],
  'cedar park': ['78613', '78630'],
  georgetown: ['78626', '78628', '78633'],
  pflugerville: ['78660', '78691'],
  leander: ['78641', '78645'],
  kyle: ['78640'],
  buda: ['78610'],
  'san marcos': ['78666'],
  temple: ['76501', '76502', '76504'],
  killeen: ['76541', '76542', '76543', '76549'],
  'west lake hills': ['78746'],
  'hyde park': ['78751'],
  'south austin': ['78704', '78745', '78748'],
  'north austin': ['78758', '78759', '78753'],
  'east austin': ['78702', '78721', '78723'],
  'west austin': ['78703', '78731', '78746'],
  downtown: ['78701', '78702'],
};

function normalizeCityKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractEmbeddedZips(value: string): string[] {
  const matches = value.match(/\b\d{5}\b/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Resolve voice area text to ZIP codes for IDX search.
 * - Pass-through for a single 5-digit ZIP
 * - Extract embedded ZIPs from strings like "South Austin, 78704"
 * - Map known city names to ZIP clusters (Austin metro P0)
 */
export function resolveZipCodesFromArea(area: string): string[] {
  const trimmed = area.trim();
  if (!trimmed) return [];

  if (FIVE_DIGIT_ZIP.test(trimmed)) {
    return [trimmed];
  }

  const embedded = extractEmbeddedZips(trimmed);
  if (embedded.length > 0) {
    return embedded;
  }

  const key = normalizeCityKey(trimmed);
  const direct = CITY_ZIP_MAP[key];
  if (direct?.length) {
    return [...direct];
  }

  for (const [city, zips] of Object.entries(CITY_ZIP_MAP).sort(
    (a, b) => b[0].length - a[0].length
  )) {
    if (key.includes(city) || city.includes(key)) {
      return [...zips];
    }
  }

  return [];
}
