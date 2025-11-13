/**
 * Key-Value Syntax Parser
 *
 * Parses key-value syntax from broker input (e.g., "kids:3", "k:3", "deps:4")
 * and validates against known field keys.
 */

import {
  COMMAND_TO_FIELD_NAME,
  FIELD_ALIASES_MAP,
  FIELD_SHORTCUTS,
  type FieldCommand,
  MULTI_WORD_FIELDS,
  NUMERIC_FIELDS,
} from '@/config/shortcuts'
import { type NormalizedField, extractNormalizedFields, inferHouseholdSize } from '@repo/shared'

export type ValidationResult = 'valid' | 'invalid_key' | 'invalid_value'

export interface ParsedKeyValue {
  key: string
  value: string
  original: string
  validation: ValidationResult
  fieldName?: string
}

/**
 * Field aliases mapping (derived from UserProfile metadata)
 * Maps keys/aliases → commands → field names
 * This ensures no drift - UserProfile schema is the single source of truth
 */
const FIELD_ALIASES: Record<string, string> = (() => {
  const aliases: Record<string, string> = {}

  // Build aliases from shortcuts: key → command → field name
  for (const [key, command] of Object.entries(FIELD_SHORTCUTS)) {
    const fieldName = COMMAND_TO_FIELD_NAME[command as keyof typeof COMMAND_TO_FIELD_NAME]
    if (fieldName) {
      aliases[key] = fieldName
      // Also add command itself as an alias (e.g., 'kids' → 'kids')
      aliases[command] = fieldName
    }
  }

  // Add convenience aliases from UserProfile metadata (e.g., "deps" → "dependents")
  for (const [alias, command] of Object.entries(FIELD_ALIASES_MAP)) {
    const fieldName = COMMAND_TO_FIELD_NAME[command]
    if (fieldName) {
      aliases[alias] = fieldName
    }
  }

  return aliases
})()

/**
 * Parse key-value syntax from text
 * Also includes natural language normalization (e.g., "2 drivers" → householdSize:2)
 *
 * @param text - Text containing key-value pairs (e.g., "Client needs auto, k:2 v:3")
 * @param validKeys - Optional set of valid keys (if not provided, uses all known aliases)
 * @returns Array of parsed key-value pairs with validation results
 */
export function parseKeyValueSyntax(text: string, validKeys?: Set<string>): ParsedKeyValue[] {
  const results: ParsedKeyValue[] = []
  const knownKeys = validKeys || new Set(Object.keys(FIELD_ALIASES))

  const processedRanges: Array<{ start: number; end: number }> = []

  // Step 1: Extract normalized fields from natural language patterns
  // This runs before key-value parsing so normalized fields can be converted to pills
  // Extract direct fields: "2 drivers" → drivers: 2, "2 kids" → kids: 2, etc.
  const extractedFieldsMap = new Map<string, NormalizedField>()

  try {
    const normalizedFields = extractNormalizedFields(text)

    // Convert normalized fields to parsed key-value format
    for (const field of normalizedFields) {
      // Check if field is in known keys
      if (knownKeys.has(field.fieldName)) {
        const key = field.fieldName
        const value = String(field.value)

        results.push({
          key,
          value,
          original: field.originalText,
          validation: 'valid',
          fieldName: field.fieldName,
        })

        // Store in map for inference
        extractedFieldsMap.set(field.fieldName, field)

        // Track processed range to avoid duplicate extraction
        processedRanges.push({ start: field.startIndex, end: field.endIndex })
      }
    }

    // Step 2: Infer householdSize from indicator fields if not explicitly set
    // This ensures "2 drivers" creates drivers: 2 pill, and optionally infers householdSize: 2
    const inferredHouseholdSize = inferHouseholdSize(extractedFieldsMap)
    if (inferredHouseholdSize && knownKeys.has('householdSize')) {
      // Only add inferred householdSize if it wasn't already extracted explicitly
      if (!extractedFieldsMap.has('householdSize')) {
        results.push({
          key: 'householdSize',
          value: String(inferredHouseholdSize.value),
          original: inferredHouseholdSize.originalText,
          validation: 'valid',
          fieldName: 'householdSize',
        })
      }
    }
  } catch (error) {
    // If normalization fails, skip it (graceful degradation)
    // This can happen if shared package isn't available or normalization logic has issues
    console.warn('Field normalization failed:', error)
  }

  // Regex patterns: matches key:value
  // Case-insensitive matching
  // Strategy: Use separate patterns for fields with special character requirements
  // Order matters: more specific patterns first, then general fallback
  // 1. Multi-word fields (name, productLine, etc.) - allow spaces, stop at comma/period/next key:value
  const multiWordPattern = /(\w+):((?:[^\s:,\.]+(?:\s+[^\s:,\.]+)*)+)(?=,|\.|(?:\s+\w+:)|$)/gi
  // 2. Phone pattern - allows spaces, dashes, parentheses (e.g., "(555) 123-4567")
  const phonePattern = /(\w+):([\d\s\-\(\)]+)(?=\s|,|\.|(?:\s+\w+:)|$)/gi
  // 3. Email pattern - allows periods, @, and other email chars
  // More permissive to catch invalid emails too (e.g., "user.name@example.com" or "notanemail.com")
  // Note: stops at space/comma but NOT at period (periods are part of email addresses)
  const emailPattern = /(\w+):([a-zA-Z0-9._+-@]+)(?=\s|,|$)/gi
  // 4. Zip pattern - allows dashes (e.g., "12345-6789")
  const zipPattern = /(\w+):([\d\-]+)(?=\s|,|\.|$)/gi
  // 5. Other fields (default) - stop at space, comma, period, or end
  const otherPattern = /(\w+):([^\s:,\.]+)(?=\s|,|\.|$)/gi

  // Helper function to check if a range was already processed (any overlap)
  const isAlreadyProcessed = (start: number, end: number): boolean => {
    return processedRanges.some((range) => {
      // Check for any overlap: ranges overlap if they don't NOT overlap
      return !(end <= range.start || start >= range.end)
    })
  }

  // Helper function to process a match
  const processMatch = (
    match: RegExpExecArray,
    patternName: string,
    fieldFilter?: (normalizedKey: string) => boolean
  ): boolean => {
    if (!match[1] || !match[2]) return false

    const original = match[0]
    const key = match[1].toLowerCase()
    const value = match[2]
    const matchStart = match.index
    const matchEnd = matchStart + original.length

    if (isAlreadyProcessed(matchStart, matchEnd)) return false

    const fieldName = FIELD_ALIASES[key]
    const normalizedKey = fieldName || key

    // Check if key is valid
    const isValidKey = knownKeys.has(key) || (fieldName ? knownKeys.has(fieldName) : false)
    if (!isValidKey) return false

    // Apply field filter if provided
    if (fieldFilter && !fieldFilter(normalizedKey)) return false

    // Skip if already processed as a different field type
    if (isAlreadyProcessed(matchStart, matchEnd)) return false

    return true
  }

  // Pass 1: Multi-word fields (excluding phone, which has its own pattern)
  multiWordPattern.lastIndex = 0
  let match: RegExpExecArray | null = multiWordPattern.exec(text)
  while (match !== null) {
    if (
      processMatch(match, 'multiWord', (key) => {
        return MULTI_WORD_FIELDS.has(key as FieldCommand) && key !== 'phone'
      })
    ) {
      const original = match[0]
      const key = match[1]?.toLowerCase() ?? ''
      const value = match[2] ?? ''
      const matchStart = match.index ?? 0
      const matchEnd = matchStart + original.length
      const fieldName = FIELD_ALIASES[key]
      const normalizedKey = fieldName || key

      results.push({
        key,
        value: value.trim(),
        original,
        validation: 'valid',
        fieldName: normalizedKey,
      })
      processedRanges.push({ start: matchStart, end: matchEnd })
    }
    match = multiWordPattern.exec(text)
  }

  // Pass 2: Phone pattern
  phonePattern.lastIndex = 0
  match = phonePattern.exec(text)
  while (match !== null) {
    if (processMatch(match, 'phone', (key) => key === 'phone')) {
      const original = match[0]
      const key = match[1]?.toLowerCase() ?? ''
      const value = match[2] ?? ''
      const matchStart = match.index ?? 0
      const matchEnd = matchStart + original.length

      results.push({
        key,
        value: value.trim(),
        original,
        validation: 'valid',
        fieldName: 'phone',
      })
      processedRanges.push({ start: matchStart, end: matchEnd })
    }
    match = phonePattern.exec(text)
  }

  // Pass 3: Email pattern
  emailPattern.lastIndex = 0
  match = emailPattern.exec(text)
  while (match !== null) {
    if (processMatch(match, 'email', (key) => key === 'email')) {
      const original = match[0]
      const key = match[1]?.toLowerCase() ?? ''
      const value = match[2] ?? ''
      const matchStart = match.index ?? 0
      const matchEnd = matchStart + original.length

      // Validate email format
      const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      const validation: ValidationResult = emailRegex.test(value) ? 'valid' : 'invalid_value'

      results.push({
        key,
        value,
        original,
        validation,
        fieldName: 'email',
      })
      processedRanges.push({ start: matchStart, end: matchEnd })
    }
    match = emailPattern.exec(text)
  }

  // Pass 4: Zip pattern
  zipPattern.lastIndex = 0
  match = zipPattern.exec(text)
  while (match !== null) {
    if (processMatch(match, 'zip', (key) => key === 'zip')) {
      const original = match[0]
      const key = match[1]?.toLowerCase() ?? ''
      const value = match[2] ?? ''
      const matchStart = match.index ?? 0
      const matchEnd = matchStart + original.length

      results.push({
        key,
        value,
        original,
        validation: 'valid',
        fieldName: 'zip',
      })
      processedRanges.push({ start: matchStart, end: matchEnd })
    }
    match = zipPattern.exec(text)
  }

  // Pass 5: Other fields (default pattern)
  otherPattern.lastIndex = 0
  match = otherPattern.exec(text)

  while (match !== null) {
    if (!match[1] || !match[2]) {
      match = otherPattern.exec(text)
      continue
    }

    const original = match[0]
    const key = match[1].toLowerCase()
    const value = match[2]
    const matchStart = match.index
    const matchEnd = matchStart + original.length

    // Skip if already processed by a specialized pattern
    if (isAlreadyProcessed(matchStart, matchEnd)) {
      match = otherPattern.exec(text)
      continue
    }

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
      match = otherPattern.exec(text)
      continue
    }

    // Skip fields already handled by specialized patterns
    if (
      normalizedKey === 'phone' ||
      normalizedKey === 'email' ||
      normalizedKey === 'zip' ||
      (normalizedKey && MULTI_WORD_FIELDS.has(normalizedKey as FieldCommand))
    ) {
      match = otherPattern.exec(text)
      continue
    }

    // Validate value type for numeric fields
    if (normalizedKey && NUMERIC_FIELDS.has(normalizedKey)) {
      // Remove commas for parsing (e.g., "1,200" -> 1200)
      const numValue = Number.parseInt(value.replace(/,/g, ''), 10)
      if (Number.isNaN(numValue)) {
        results.push({
          key,
          value,
          original,
          validation: 'invalid_value',
          fieldName: normalizedKey,
        })
        match = otherPattern.exec(text)
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

    match = otherPattern.exec(text)
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
