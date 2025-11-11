import type { UserProfile } from '@repo/shared'

/**
 * Key-Value Syntax Parser
 *
 * Parses key-value syntax from broker input (e.g., "kids:3", "k:3", "deps:4", "car:garage")
 * and extracts structured data matching UserProfile schema.
 *
 * Field aliases supported:
 * - k/kids → kids
 * - d/deps → dependents (maps to householdSize)
 * - v/vehicles → vehicles
 * - c/car → vehicles (alias)
 * - s/state → state
 * - a/age → age
 * - h/household → householdSize
 * - l/productLine → productLine
 * - o/ownsHome → ownsHome
 * - cleanRecord3Yr → cleanRecord3Yr
 */

export interface KeyValueExtractionResult {
  profile: Partial<UserProfile>
  extractionMethod: 'key-value'
  confidence: 1.0 // Key-value extraction is always 100% confident
}

/**
 * Field alias mapping
 * Maps shortcuts and aliases to UserProfile field names
 */
const FIELD_ALIASES: Record<string, string> = {
  // Kids
  k: 'kids',
  kids: 'kids',
  // Dependents (maps to householdSize)
  d: 'householdSize',
  deps: 'householdSize',
  dependents: 'householdSize',
  // Vehicles
  v: 'vehicles',
  vehicles: 'vehicles',
  c: 'vehicles', // car alias
  car: 'vehicles',
  // State
  s: 'state',
  state: 'state',
  // Age
  a: 'age',
  age: 'age',
  // Household size
  h: 'householdSize',
  household: 'householdSize',
  householdSize: 'householdSize',
  // Product line
  l: 'productLine',
  productLine: 'productLine',
  product: 'productLine',
  line: 'productLine',
  // Owns home
  o: 'ownsHome',
  ownsHome: 'ownsHome',
  // Clean record
  clean: 'cleanRecord3Yr',
  cleanRecord: 'cleanRecord3Yr',
  cleanRecord3Yr: 'cleanRecord3Yr',
}

/**
 * Numeric fields that require number conversion
 */
const NUMERIC_FIELDS = new Set([
  'age',
  'kids',
  'householdSize',
  'vehicles',
  'currentPremium',
])

/**
 * Boolean fields
 */
const BOOLEAN_FIELDS = new Set(['ownsHome', 'cleanRecord3Yr'])

/**
 * Product line enum values
 */
const PRODUCT_LINE_VALUES = ['auto', 'home', 'renters', 'umbrella'] as const

/**
 * Parse key-value syntax from message
 *
 * @param message - Broker message containing key-value pairs
 * @returns Extraction result with profile and metadata
 */
export function parseKeyValueSyntax(
  message: string
): KeyValueExtractionResult {
  const profile: Partial<UserProfile> = {}

  // Regex pattern: matches key:value (case-insensitive)
  // Stops at space, comma, period, or end of string
  const kvPattern = /(\w+):(\w+|\d+)(?=\s|,|\.|$)/gi
  let match: RegExpExecArray | null = kvPattern.exec(message)

  while (match !== null) {
    const key = match[1]
    const value = match[2]
    if (!key || !value) {
      match = kvPattern.exec(message)
      continue
    }

    const lowerKey = key.toLowerCase()
    const fieldName = FIELD_ALIASES[lowerKey]

    if (fieldName) {
      // Convert value based on field type
      if (NUMERIC_FIELDS.has(fieldName)) {
        const numValue = Number.parseInt(value, 10)
        if (!Number.isNaN(numValue)) {
          // @ts-expect-error - Dynamic field assignment
          profile[fieldName] = numValue
        }
      } else if (BOOLEAN_FIELDS.has(fieldName)) {
        // Boolean fields: "true", "1", "yes" → true, else false
        const boolValue =
          value.toLowerCase() === 'true' ||
          value === '1' ||
          value.toLowerCase() === 'yes'
        // @ts-expect-error - Dynamic field assignment
        profile[fieldName] = boolValue
      } else if (fieldName === 'productLine') {
        // Validate product line enum
        const productValue = value.toLowerCase()
        if (PRODUCT_LINE_VALUES.includes(productValue as typeof PRODUCT_LINE_VALUES[number])) {
          profile.productLine = productValue as typeof PRODUCT_LINE_VALUES[number]
        }
      } else {
        // String fields
        // @ts-expect-error - Dynamic field assignment
        profile[fieldName] = value
      }
    }

    match = kvPattern.exec(message)
  }

  return {
    profile,
    extractionMethod: 'key-value',
    confidence: 1.0,
  }
}

/**
 * Check if message contains key-value syntax
 *
 * @param message - Broker message to check
 * @returns True if key-value pattern detected
 */
export function hasKeyValueSyntax(message: string): boolean {
  const kvPattern = /(\w+):(\w+|\d+)(?=\s|,|\.|$)/gi
  return kvPattern.test(message)
}

