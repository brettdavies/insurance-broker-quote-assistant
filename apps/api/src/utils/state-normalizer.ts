/**
 * State Normalizer
 *
 * Deterministic normalization of US state names to state codes.
 * Handles common variations: "California" → "CA", "california" → "CA", etc.
 *
 * Used as fallback when LLM extraction fails or isn't available.
 */

/**
 * US State name to code mapping
 * Organized by state code, includes full names and common abbreviations
 */
const STATE_NAME_TO_CODE: Record<string, string> = {
  // AL - Alabama
  alabama: 'AL',
  // AK - Alaska
  alaska: 'AK',
  // AZ - Arizona
  arizona: 'AZ',
  // AR - Arkansas
  arkansas: 'AR',
  // CA - California
  california: 'CA',
  cali: 'CA',
  // CO - Colorado
  colorado: 'CO',
  // CT - Connecticut
  connecticut: 'CT',
  // DE - Delaware
  delaware: 'DE',
  // FL - Florida
  florida: 'FL',
  fla: 'FL',
  // GA - Georgia
  georgia: 'GA',
  // HI - Hawaii
  hawaii: 'HI',
  // ID - Idaho
  idaho: 'ID',
  // IL - Illinois
  illinois: 'IL',
  ill: 'IL',
  // IN - Indiana
  indiana: 'IN',
  // IA - Iowa
  iowa: 'IA',
  // KS - Kansas
  kansas: 'KS',
  // KY - Kentucky
  kentucky: 'KY',
  // LA - Louisiana
  louisiana: 'LA',
  // ME - Maine
  maine: 'ME',
  // MD - Maryland
  maryland: 'MD',
  // MA - Massachusetts
  massachusetts: 'MA',
  mass: 'MA',
  // MI - Michigan
  michigan: 'MI',
  mich: 'MI',
  // MN - Minnesota
  minnesota: 'MN',
  minn: 'MN',
  // MS - Mississippi
  mississippi: 'MS',
  miss: 'MS',
  // MO - Missouri
  missouri: 'MO',
  // MT - Montana
  montana: 'MT',
  // NE - Nebraska
  nebraska: 'NE',
  neb: 'NE',
  // NV - Nevada
  nevada: 'NV',
  // NH - New Hampshire
  'new hampshire': 'NH',
  // NJ - New Jersey
  'new jersey': 'NJ',
  // NM - New Mexico
  'new mexico': 'NM',
  // NY - New York
  'new york': 'NY',
  // NC - North Carolina
  'north carolina': 'NC',
  // ND - North Dakota
  'north dakota': 'ND',
  // OH - Ohio
  ohio: 'OH',
  // OK - Oklahoma
  oklahoma: 'OK',
  okla: 'OK',
  // OR - Oregon
  oregon: 'OR',
  // PA - Pennsylvania
  pennsylvania: 'PA',
  penn: 'PA',
  penna: 'PA',
  // RI - Rhode Island
  'rhode island': 'RI',
  // SC - South Carolina
  'south carolina': 'SC',
  // SD - South Dakota
  'south dakota': 'SD',
  // TN - Tennessee
  tennessee: 'TN',
  tenn: 'TN',
  // TX - Texas
  texas: 'TX',
  tex: 'TX',
  // UT - Utah
  utah: 'UT',
  // VT - Vermont
  vermont: 'VT',
  // VA - Virginia
  virginia: 'VA',
  // WA - Washington
  washington: 'WA',
  wash: 'WA',
  // WV - West Virginia
  'west virginia': 'WV',
  // WI - Wisconsin
  wisconsin: 'WI',
  wisc: 'WI',
  // WY - Wyoming
  wyoming: 'WY',
  // DC - District of Columbia
  'district of columbia': 'DC',
  'washington dc': 'DC',
  'washington d.c.': 'DC',
  'washington d c': 'DC',
  'd.c.': 'DC',
  'd c': 'DC',
}

/**
 * Normalize state name or code to uppercase state code
 *
 * @param input - State name (e.g., "California", "california") or code (e.g., "CA", "ca")
 * @returns Uppercase state code (e.g., "CA") or undefined if not recognized
 *
 * @example
 * normalizeState("California") // "CA"
 * normalizeState("california") // "CA"
 * normalizeState("CA") // "CA"
 * normalizeState("ca") // "CA"
 * normalizeState("New York") // "NY"
 */
export function normalizeState(input: string | undefined | null): string | undefined {
  if (!input) {
    return undefined
  }

  // Normalize input: trim, lowercase, remove extra spaces
  const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ')

  // If already a 2-letter code, validate and return uppercase
  if (normalized.length === 2) {
    const upperCode = normalized.toUpperCase()
    // Check if it's a valid state code
    if (Object.values(STATE_NAME_TO_CODE).includes(upperCode)) {
      return upperCode
    }
  }

  // Try direct lookup
  const code = STATE_NAME_TO_CODE[normalized]
  if (code) {
    return code
  }

  // Try partial matching for multi-word states (e.g., "new york" → "NY")
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return code
    }
  }

  return undefined
}

/**
 * Extract state from text using normalization
 *
 * Looks for state mentions in text and normalizes them to codes.
 * Handles patterns like "in California", "California", "CA", etc.
 *
 * @param text - Text that may contain state name or code
 * @returns State code if found, undefined otherwise
 *
 * @example
 * extractStateFromText("I'm in California") // "CA"
 * extractStateFromText("Looking for insurance in CA") // "CA"
 * extractStateFromText("New York resident") // "NY"
 */
export function extractStateFromText(text: string): string | undefined {
  if (!text) {
    return undefined
  }

  // Try to find state mentions in common patterns
  const patterns = [
    // "in California", "from California", "California resident"
    /\b(in|from|of|resident|located|based)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i,
    // "California" standalone
    /\b(California|Texas|Florida|New York|Illinois|New Jersey|Pennsylvania|Ohio|Georgia|North Carolina|Michigan|Virginia|Washington|Massachusetts|Tennessee|Indiana|Arizona|Missouri|Maryland|Wisconsin|Colorado|Minnesota|South Carolina|Alabama|Louisiana|Kentucky|Oregon|Oklahoma|Connecticut|Utah|Iowa|Nevada|Arkansas|Mississippi|Kansas|New Mexico|Nebraska|West Virginia|Idaho|Hawaii|New Hampshire|Maine|Montana|Rhode Island|Delaware|South Dakota|North Dakota|Alaska|Vermont|Wyoming|District of Columbia)\b/i,
    // State codes: "CA", "TX", etc.
    /\b([A-Z]{2})\b/,
  ]

  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      // Try to extract state from match
      const potentialState = matches[matches.length - 1] // Last capture group
      const normalized = normalizeState(potentialState)
      if (normalized) {
        return normalized
      }
    }
  }

  // Fallback: try normalizing entire text (for cases like "California" as full message)
  return normalizeState(text)
}
