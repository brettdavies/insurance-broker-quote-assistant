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
  'geico': 'GEICO',
  'state farm': 'STATE FARM',
  'progressive': 'PROGRESSIVE',
  'allstate': 'ALLSTATE',
  'liberty mutual': 'LIBERTY MUTUAL',
  'usaa': 'USAA',
  'nationwide': 'NATIONWIDE',
  'farmers': 'FARMERS',
  'american family': 'AMERICAN FAMILY',
  'travelers': 'TRAVELERS',
}
