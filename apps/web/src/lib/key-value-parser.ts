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
 *
 * @param text - Text containing key-value pairs (e.g., "Client needs auto, k:2 v:3")
 * @param validKeys - Optional set of valid keys (if not provided, uses all known aliases)
 * @returns Array of parsed key-value pairs with validation results
 */
export function parseKeyValueSyntax(text: string, validKeys?: Set<string>): ParsedKeyValue[] {
  const results: ParsedKeyValue[] = []
  const knownKeys = validKeys || new Set(Object.keys(FIELD_ALIASES))

  // Regex pattern: matches key:value
  // Case-insensitive matching
  // Strategy: Match greedily, then validate based on field type
  // - Multi-word fields: allow spaces, stop at comma/period/end or next key:value pattern
  // - Email fields: allow periods, stop at space/comma/period/end
  // - Numeric fields: allow commas, stop at space/comma/period/end
  // - Other fields: stop at space/comma/period/end
  // First, try to match multi-word fields (allow spaces) - they stop at comma, period, or next key:value
  const multiWordPattern = /(\w+):((?:[^\s:,\.]+(?:\s+[^\s:,\.]+)*)+)(?=,|\.|(?:\s+\w+:)|$)/gi
  // Then match other fields (no spaces in value) - stop at space, comma, period, or end
  const otherPattern = /(\w+):([^\s:,\.]+)(?=\s|,|\.|$)/gi

  // Try multi-word pattern first (for fields that allow spaces)
  multiWordPattern.lastIndex = 0
  let match: RegExpExecArray | null = multiWordPattern.exec(text)
  const processedRanges: Array<{ start: number; end: number }> = []

  // First pass: Match multi-word fields (allow spaces)
  while (match !== null) {
    if (!match[1] || !match[2]) {
      match = multiWordPattern.exec(text)
      continue
    }

    const original = match[0]
    const key = match[1].toLowerCase()
    const value = match[2]
    const matchStart = match.index
    const matchEnd = matchStart + original.length

    // Resolve field name from alias
    const fieldName = FIELD_ALIASES[key]
    const normalizedKey = fieldName || key

    // Only process if this is a multi-word field
    if (normalizedKey && MULTI_WORD_FIELDS.has(normalizedKey as FieldCommand)) {
      // Check if key is valid
      const isValidKey = knownKeys.has(key) || (fieldName ? knownKeys.has(fieldName) : false)

      if (isValidKey) {
        results.push({
          key,
          value: value.trim(),
          original,
          validation: 'valid',
          fieldName: normalizedKey,
        })
        processedRanges.push({ start: matchStart, end: matchEnd })
      }
    }

    match = multiWordPattern.exec(text)
  }

  // Second pass: Match other fields (no spaces in value)
  // Skip ranges already processed by name pattern
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

    // Skip if this range was already processed as a name field
    const isAlreadyProcessed = processedRanges.some(
      (range) => matchStart >= range.start && matchEnd <= range.end
    )

    if (isAlreadyProcessed) {
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

    // Skip multi-word fields (already processed)
    if (normalizedKey && MULTI_WORD_FIELDS.has(normalizedKey as FieldCommand)) {
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
