/**
 * Key-Value Syntax Parser
 *
 * Parses key-value syntax from broker input (e.g., "kids:3", "k:3", "deps:4")
 * and validates against known field keys.
 */

export type ValidationResult = 'valid' | 'invalid_key' | 'invalid_value'

export interface ParsedKeyValue {
  key: string
  value: string
  original: string
  validation: ValidationResult
  fieldName?: string
}

/**
 * Field aliases mapping (short keys to full field names)
 */
const FIELD_ALIASES: Record<string, string> = {
  k: 'kids',
  kids: 'kids',
  d: 'dependents',
  deps: 'dependents',
  dependents: 'dependents',
  v: 'vehicles',
  vehicles: 'vehicles',
  n: 'name',
  name: 'name',
  e: 'email',
  email: 'email',
  p: 'phone',
  phone: 'phone',
  s: 'state',
  state: 'state',
  z: 'zip',
  zip: 'zip',
  l: 'productLine',
  product: 'productLine',
  productLine: 'productLine',
  a: 'age',
  age: 'age',
  h: 'householdSize',
  household: 'householdSize',
  householdSize: 'householdSize',
  g: 'garage',
  garage: 'garage',
  i: 'vins',
  vins: 'vins',
  r: 'drivers',
  drivers: 'drivers',
  c: 'drivingRecords',
  drivingRecords: 'drivingRecords',
  u: 'cleanRecord',
  cleanRecord: 'cleanRecord',
  o: 'ownsHome',
  ownsHome: 'ownsHome',
  owns: 'ownsHome',
  t: 'propertyType',
  propertyType: 'propertyType',
  y: 'constructionYear',
  constructionYear: 'constructionYear',
  f: 'roofType',
  roofType: 'roofType',
  q: 'squareFeet',
  squareFeet: 'squareFeet',
  w: 'existingPolicies',
  existingPolicies: 'existingPolicies',
  m: 'currentPremium',
  currentPremium: 'currentPremium',
  b: 'deductibles',
  deductibles: 'deductibles',
  x: 'limits',
  limits: 'limits',
}

/**
 * Field types for validation
 */
const NUMERIC_FIELDS = new Set([
  'kids',
  'householdSize',
  'dependents',
  'vehicles',
  'age',
  'household',
  'constructionYear',
  'squareFeet',
  'currentPremium',
])

/**
 * Parse key-value syntax from text
 *
 * @param text - Text containing key-value pairs (e.g., "Client needs auto, k:2 v:3")
 * @param validKeys - Optional set of valid keys (if not provided, uses all known aliases)
 * @returns Array of parsed key-value pairs with validation results
 */
export function parseKeyValueSyntax(text: string, validKeys?: Set<string>): ParsedKeyValue[] {
  const results: ParsedKeyValue[] = []
  const knownKeys = validKeys || new Set(Object.keys(FIELD_ALIASES))

  // Regex pattern: matches key:value followed by space, comma, period, or end of string
  // Case-insensitive matching
  const pattern = /(\w+):(\w+|\d+)(?=\s|,|\.|$)/gi
  let match: RegExpExecArray | null = pattern.exec(text)

  while (match !== null) {
    if (!match[1] || !match[2]) {
      match = pattern.exec(text)
      continue
    }

    const original = match[0]
    const key = match[1].toLowerCase()
    const value = match[2]

    // Resolve field name from alias
    const fieldName = FIELD_ALIASES[key]
    const normalizedKey = fieldName || key

    // Check if key is valid
    const isValidKey = knownKeys.has(key) || (fieldName ? knownKeys.has(fieldName) : false)

    if (!isValidKey) {
      results.push({
        key,
        value,
        original,
        validation: 'invalid_key',
      })
      match = pattern.exec(text)
      continue
    }

    // Validate value type for numeric fields
    if (normalizedKey && NUMERIC_FIELDS.has(normalizedKey)) {
      const numValue = Number.parseInt(value, 10)
      if (Number.isNaN(numValue)) {
        results.push({
          key,
          value,
          original,
          validation: 'invalid_value',
          fieldName: normalizedKey,
        })
        continue
      }
    }

    results.push({
      key,
      value,
      original,
      validation: 'valid',
      fieldName: normalizedKey,
    })
  }

  return results
}

/**
 * Extract structured fields from parsed key-value pairs
 *
 * @param parsed - Array of parsed key-value pairs
 * @returns Object mapping field names to values
 */
export function extractFields(parsed: ParsedKeyValue[]): Record<string, string | number> {
  const fields: Record<string, string | number> = {}

  for (const item of parsed) {
    if (item.validation === 'valid' && item.fieldName) {
      const normalizedKey = item.fieldName

      // Convert to number if it's a numeric field
      if (NUMERIC_FIELDS.has(normalizedKey)) {
        const numValue = Number.parseInt(item.value, 10)
        if (!Number.isNaN(numValue)) {
          fields[normalizedKey] = numValue
        }
      } else {
        fields[normalizedKey] = item.value
      }
    }
  }

  return fields
}

/**
 * Get field name from key alias
 *
 * @param key - Key alias (e.g., "k", "kids")
 * @returns Full field name or undefined if not found
 */
export function getFieldName(key: string): string | undefined {
  return FIELD_ALIASES[key.toLowerCase()]
}
