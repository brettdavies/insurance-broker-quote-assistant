/**
 * Field Normalizer
 *
 * Shared utilities for normalizing natural language broker notes into structured field values.
 * Used by both frontend (pill creation) and backend (extraction fallback).
 *
 * These functions detect patterns like "2 drivers" → householdSize: 2,
 * "owns home" → ownsHome: true, etc., and can be used to create pills
 * or extract fields deterministically.
 */

/**
 * US State name to code mapping
 * Organized by state code, includes full names and common abbreviations
 */
export const STATE_NAME_TO_CODE: Record<string, string> = {
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

  // Look up in mapping
  const code = STATE_NAME_TO_CODE[normalized]
  if (code) {
    return code
  }

  // Try partial matches for multi-word states (e.g., "new york" might be split)
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return code
    }
  }

  return undefined
}

/**
 * Extract state from broker notes text
 * Looks for state mentions in common patterns
 *
 * @param text - Broker notes text
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

export interface NormalizedField {
  fieldName: string
  value: string | number | boolean
  originalText: string
  startIndex: number
  endIndex: number
}

/**
 * Extract number of drivers from broker notes
 * Looks for patterns like "2 drivers", "3 drivers", etc.
 */
export function extractDrivers(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Pattern: "X drivers" or "X driver"
  const driversMatch = lowerText.match(/(\d+)\s+drivers?/)
  if (driversMatch) {
    const num = Number.parseInt(driversMatch[1] || '', 10)
    if (!Number.isNaN(num) && num > 0) {
      const startIndex = driversMatch.index ?? 0
      return {
        fieldName: 'drivers',
        value: num,
        originalText: driversMatch[0],
        startIndex,
        endIndex: startIndex + driversMatch[0].length,
      }
    }
  }

  return null
}

/**
 * Extract number of kids from broker notes
 * Looks for patterns like "2 kids", "3 children", etc.
 */
export function extractKids(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Pattern: "X kids" or "X kid"
  const kidsMatch = lowerText.match(/(\d+)\s+kids?/)
  if (kidsMatch) {
    const num = Number.parseInt(kidsMatch[1] || '', 10)
    if (!Number.isNaN(num) && num >= 0) {
      const startIndex = kidsMatch.index ?? 0
      return {
        fieldName: 'kids',
        value: num,
        originalText: kidsMatch[0],
        startIndex,
        endIndex: startIndex + kidsMatch[0].length,
      }
    }
  }

  // Pattern: "X children" or "X child"
  const childrenMatch = lowerText.match(/(\d+)\s+children?/)
  if (childrenMatch) {
    const num = Number.parseInt(childrenMatch[1] || '', 10)
    if (!Number.isNaN(num) && num >= 0) {
      const startIndex = childrenMatch.index ?? 0
      return {
        fieldName: 'kids',
        value: num,
        originalText: childrenMatch[0],
        startIndex,
        endIndex: startIndex + childrenMatch[0].length,
      }
    }
  }

  return null
}

/**
 * Extract household size from broker notes
 * Only extracts from EXPLICIT mentions like "family of 4", "lives alone", "2 people"
 * Does NOT extract from "2 drivers" or "2 kids" - those are extracted separately
 */
export function extractHouseholdSize(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Pattern: "lives alone" or "lives by self" → 1
  const aloneMatch = lowerText.match(/\b(lives\s+alone|lives\s+by\s+self|single|solo)\b/)
  if (aloneMatch) {
    const startIndex = aloneMatch.index ?? 0
    return {
      fieldName: 'householdSize',
      value: 1,
      originalText: aloneMatch[0],
      startIndex,
      endIndex: startIndex + aloneMatch[0].length,
    }
  }

  // Pattern: "family of X" or "household of X" → X
  const familyMatch = lowerText.match(/\b(family|household)\s+of\s+(\d+)\b/)
  if (familyMatch) {
    const num = Number.parseInt(familyMatch[2] || '', 10)
    if (!Number.isNaN(num) && num > 0) {
      const startIndex = familyMatch.index ?? 0
      return {
        fieldName: 'householdSize',
        value: num,
        originalText: familyMatch[0],
        startIndex,
        endIndex: startIndex + familyMatch[0].length,
      }
    }
  }

  // Pattern: "X people" or "X person household" (explicit household size mention)
  const peopleMatch = lowerText.match(/(\d+)\s+(people|person|ppl)\b/)
  if (peopleMatch) {
    const num = Number.parseInt(peopleMatch[1] || '', 10)
    if (!Number.isNaN(num) && num > 0) {
      const startIndex = peopleMatch.index ?? 0
      return {
        fieldName: 'householdSize',
        value: num,
        originalText: peopleMatch[0],
        startIndex,
        endIndex: startIndex + peopleMatch[0].length,
      }
    }
  }

  return null
}

/**
 * Extract home ownership status from broker notes
 * Looks for patterns like "owns home", "homeowner", "rents", "renting", etc.
 */
export function extractOwnsHome(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Positive indicators
  const ownsMatch = lowerText.match(
    /\b(owns\s+home|homeowner|owns\s+house|owns\s+property|home\s+owner)\b/
  )
  if (ownsMatch) {
    const startIndex = ownsMatch.index ?? 0
    return {
      fieldName: 'ownsHome',
      value: true,
      originalText: ownsMatch[0],
      startIndex,
      endIndex: startIndex + ownsMatch[0].length,
    }
  }

  // Negative indicators
  const rentsMatch = lowerText.match(
    /\b(rents|renting|renter|rental|apartment|apt|leases|leasing)\b/
  )
  if (rentsMatch) {
    const startIndex = rentsMatch.index ?? 0
    return {
      fieldName: 'ownsHome',
      value: false,
      originalText: rentsMatch[0],
      startIndex,
      endIndex: startIndex + rentsMatch[0].length,
    }
  }

  return null
}

/**
 * Extract zip code from broker notes
 * Looks for patterns like "zip 90210", "90210", "zip code 90210", etc.
 */
export function extractZip(text: string): NormalizedField | null {
  // Pattern: "zip 90210" or "zip code 90210"
  const zipMatch = text.match(/\bzip\s+(?:code\s+)?(\d{5}(?:-\d{4})?)\b/i)
  if (zipMatch?.[1]) {
    const startIndex = zipMatch.index ?? 0
    return {
      fieldName: 'zip',
      value: zipMatch[1],
      originalText: zipMatch[0],
      startIndex,
      endIndex: startIndex + zipMatch[0].length,
    }
  }

  // Pattern: standalone 5-digit number near "zip" keyword
  const standaloneMatch = text.match(/\b(zip|postal|postcode|zcode)\s*:?\s*(\d{5}(?:-\d{4})?)\b/i)
  if (standaloneMatch?.[2]) {
    const startIndex = standaloneMatch.index ?? 0
    return {
      fieldName: 'zip',
      value: standaloneMatch[2],
      originalText: standaloneMatch[0],
      startIndex,
      endIndex: startIndex + standaloneMatch[0].length,
    }
  }

  // Pattern: "90210" as standalone (only if near zip-related keywords)
  const contextMatch = text.match(/\b(\d{5})\b/)
  if (contextMatch) {
    const potentialZip = contextMatch[1]
    if (potentialZip && potentialZip.length === 5) {
      const context = text.toLowerCase()
      const zipIndex = context.indexOf(potentialZip)
      const beforeContext = context.substring(Math.max(0, zipIndex - 20), zipIndex)
      if (beforeContext.match(/\b(zip|postal|postcode|address|location)\b/)) {
        const startIndex = contextMatch.index ?? 0
        return {
          fieldName: 'zip',
          value: potentialZip,
          originalText: contextMatch[0],
          startIndex,
          endIndex: startIndex + contextMatch[0].length,
        }
      }
    }
  }

  return null
}

/**
 * Extract age from broker notes
 * Looks for patterns like "35yo", "35 years old", "age 35", etc.
 */
export function extractAge(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Pattern: "35yo" or "35 yo" or "35y/o"
  const yoMatch = lowerText.match(/(\d+)\s*y\s*o\b/i)
  if (yoMatch?.[1]) {
    const num = Number.parseInt(yoMatch[1], 10)
    if (!Number.isNaN(num) && num > 0 && num < 150) {
      const startIndex = yoMatch.index ?? 0
      return {
        fieldName: 'age',
        value: num,
        originalText: yoMatch[0],
        startIndex,
        endIndex: startIndex + yoMatch[0].length,
      }
    }
  }

  // Pattern: "age 35" or "age: 35"
  const ageMatch = lowerText.match(/\bage\s*:?\s*(\d+)\b/i)
  if (ageMatch?.[1]) {
    const num = Number.parseInt(ageMatch[1], 10)
    if (!Number.isNaN(num) && num > 0 && num < 150) {
      const startIndex = ageMatch.index ?? 0
      return {
        fieldName: 'age',
        value: num,
        originalText: ageMatch[0],
        startIndex,
        endIndex: startIndex + ageMatch[0].length,
      }
    }
  }

  // Pattern: "35 years old" or "35 yrs old"
  const yearsOldMatch = lowerText.match(/(\d+)\s*(?:years?|yrs?)\s+old\b/i)
  if (yearsOldMatch) {
    const num = Number.parseInt(yearsOldMatch[1] || '', 10)
    if (!Number.isNaN(num) && num > 0 && num < 150) {
      const startIndex = yearsOldMatch.index ?? 0
      return {
        fieldName: 'age',
        value: num,
        originalText: yearsOldMatch[0],
        startIndex,
        endIndex: startIndex + yearsOldMatch[0].length,
      }
    }
  }

  return null
}

/**
 * Extract all normalized fields from broker notes
 * Returns array of normalized fields that can be converted to pills
 *
 * Note: This extracts direct fields only. householdSize inference should be done
 * separately after all fields are extracted to avoid overwriting explicit values.
 */
export function extractNormalizedFields(text: string): NormalizedField[] {
  const fields: NormalizedField[] = []
  const processedRanges: Array<{ start: number; end: number }> = []

  // Helper to check if range overlaps with already processed ranges
  const isOverlapping = (start: number, end: number): boolean => {
    return processedRanges.some((range) => {
      return !(end <= range.start || start >= range.end)
    })
  }

  // Extract all field types (order matters - more specific patterns first)
  const extractors = [
    extractDrivers, // Extract "2 drivers" → drivers: 2
    extractKids, // Extract "2 kids" → kids: 2
    extractHouseholdSize, // Extract explicit household size mentions
    extractOwnsHome,
    extractZip,
    extractAge,
  ]

  for (const extractor of extractors) {
    const field = extractor(text)
    if (field && !isOverlapping(field.startIndex, field.endIndex)) {
      fields.push(field)
      processedRanges.push({ start: field.startIndex, end: field.endIndex })
    }
  }

  // Sort by start index
  return fields.sort((a, b) => a.startIndex - b.startIndex)
}

/**
 * Infer householdSize from other indicator fields
 * Only infers if householdSize is not already explicitly set
 *
 * Inference rules:
 * - If drivers is set and householdSize is not set → householdSize = drivers
 * - If kids is set and householdSize is not set → householdSize = kids + 1 (assuming 1 adult)
 * - Never overwrites an explicitly set householdSize
 *
 * @param extractedFields - Map of already extracted fields
 * @returns NormalizedField for householdSize if inferred, null otherwise
 */
export function inferHouseholdSize(
  extractedFields: Map<string, NormalizedField>
): NormalizedField | null {
  // Never overwrite an explicitly set householdSize
  if (extractedFields.has('householdSize')) {
    return null
  }

  // Infer from drivers if available
  const driversField = extractedFields.get('drivers')
  if (driversField && typeof driversField.value === 'number') {
    return {
      fieldName: 'householdSize',
      value: driversField.value,
      originalText: `(inferred from ${driversField.originalText})`,
      startIndex: driversField.startIndex,
      endIndex: driversField.endIndex,
    }
  }

  // Infer from kids if available (kids + 1 adult)
  const kidsField = extractedFields.get('kids')
  if (kidsField && typeof kidsField.value === 'number') {
    return {
      fieldName: 'householdSize',
      value: kidsField.value + 1,
      originalText: `(inferred from ${kidsField.originalText})`,
      startIndex: kidsField.startIndex,
      endIndex: kidsField.endIndex,
    }
  }

  return null
}

/**
 * Convert normalized field to key-value format for pill creation
 * Returns format like "householdSize:2" that can be parsed by key-value parser
 */
export function normalizedFieldToKeyValue(field: NormalizedField): string {
  return `${field.fieldName}:${field.value}`
}
