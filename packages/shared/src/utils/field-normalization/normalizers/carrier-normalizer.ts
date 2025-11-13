/**
 * Carrier Normalization
 *
 * Utilities for normalizing insurance carrier names.
 */

/**
 * Carrier name normalization mapping
 * Maps common variations and abbreviations to standard carrier names (uppercase)
 */
export const CARRIER_NORMALIZATIONS: Record<string, string> = {
  // Full names
  geico: 'GEICO',
  'state farm': 'STATE FARM',
  progressive: 'PROGRESSIVE',
  allstate: 'ALLSTATE',
  'liberty mutual': 'LIBERTY MUTUAL',
  usaa: 'USAA',
  nationwide: 'NATIONWIDE',
  farmers: 'FARMERS',
  'american family': 'AMERICAN FAMILY',
  travelers: 'TRAVELERS',

  // Common abbreviations
  pro: 'PROGRESSIVE',
  prog: 'PROGRESSIVE',
  sf: 'STATE FARM',
  statefarm: 'STATE FARM',
  lm: 'LIBERTY MUTUAL',
  liberty: 'LIBERTY MUTUAL',
  amfam: 'AMERICAN FAMILY',
  'am fam': 'AMERICAN FAMILY',
}

/**
 * Normalize carrier name using alias map
 * Converts abbreviations and variations to standard carrier names
 *
 * @param carrier - Raw carrier name (e.g., "pro", "Progressive", "PROGRESSIVE")
 * @returns Normalized carrier name (e.g., "PROGRESSIVE") or uppercased input if not found
 */
export function normalizeCarrierName(carrier: string): string {
  const lower = carrier.toLowerCase().trim()
  return CARRIER_NORMALIZATIONS[lower] || carrier.toUpperCase()
}
