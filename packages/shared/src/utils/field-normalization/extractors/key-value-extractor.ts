/**
 * Key-Value Syntax Extractor
 *
 * Extracts fields from key:value syntax (e.g., "state:CA", "k:2", "age:25")
 * Supports aliases (k→vehicles, v→drivers, etc.) via field metadata
 *
 * CRITICAL: This extractor must run FIRST in the batch extractor to capture
 * explicit key:value patterns before natural language extractors.
 */

import { getFieldNameFromAlias } from '../../pill-parsing/field-name-resolver'
import type { NormalizedField } from '../types'

/**
 * Extract all key:value patterns from text
 *
 * Patterns matched:
 * - "state:CA" → state: "CA"
 * - "k:2" → vehicles: 2
 * - "v:3" → drivers: 3
 * - "age:25" → age: 25
 * - "productType:auto" → productType: "auto"
 *
 * Note: This returns an ARRAY of fields since text may contain multiple key:value pairs
 *
 * @param text - Input text
 * @returns Array of normalized fields (may be empty)
 */
export function extractKeyValueSyntax(text: string): NormalizedField[] {
  const fields: NormalizedField[] = []

  // Special pattern for email fields (allows periods in value)
  // Matches: e:user@example.com or email:user@example.com
  // Word boundary \b ensures "e" only matches as complete word, not within "age" or "ownsHome"
  const emailPattern = /\b(e|email):([^\s,]+)/gi
  let emailMatch: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
  while ((emailMatch = emailPattern.exec(text)) !== null) {
    const fullMatch = emailMatch[0]
    const key = emailMatch[1]?.toLowerCase()
    const value = emailMatch[2]
    const startIndex = emailMatch.index
    const endIndex = startIndex + fullMatch.length

    if (!key || !value) {
      continue
    }

    fields.push({
      fieldName: 'email',
      value,
      originalText: fullMatch,
      startIndex,
      endIndex,
    })
  }

  // General key:value pattern (stops at space, comma, period)
  // This handles all non-email fields
  const pattern = /(\w+):([^\s,.]+)/g

  let match: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
  while ((match = pattern.exec(text)) !== null) {
    const fullMatch = match[0]
    const key = match[1]
    const value = match[2]
    const startIndex = match.index
    const endIndex = startIndex + fullMatch.length

    // Skip if key or value is undefined
    if (!key || !value) {
      continue
    }

    // Skip email patterns (already handled above)
    const lowerKey = key.toLowerCase()
    if (lowerKey === 'e' || lowerKey === 'email') {
      continue
    }

    // Resolve alias to canonical field name
    const fieldName = getFieldNameFromAlias(key)

    // If not a recognized field, use the original key as fieldName
    // This allows unknown fields to be extracted as pills and marked as invalid_key
    const finalFieldName = fieldName || key

    // Parse value (handle numeric, boolean, string)
    // For unknown fields, keep value as string since we don't know the type
    const parsedValue = fieldName ? parseValue(value, fieldName) : value

    fields.push({
      fieldName: finalFieldName,
      value: parsedValue,
      originalText: fullMatch,
      startIndex,
      endIndex,
    })
  }

  return fields
}

/**
 * Parse value string to appropriate type based on field name
 *
 * Uses field metadata to determine if field should be numeric, boolean, or string
 *
 * @param value - Raw value string
 * @param fieldName - Canonical field name
 * @returns Parsed value (number, boolean, or string)
 */
function parseValue(value: string, fieldName: string): string | number | boolean {
  // Numeric fields
  const numericFields = new Set([
    'age',
    'vehicles',
    'drivers',
    'kids',
    'householdSize',
    'dependents',
    'creditScore',
    'yearBuilt',
    'squareFeet',
  ])

  if (numericFields.has(fieldName)) {
    const num = Number.parseInt(value, 10)
    if (!Number.isNaN(num)) {
      return num
    }
  }

  // Boolean fields
  const booleanFields = new Set(['cleanRecord3Yr', 'cleanRecord5Yr', 'ownsHome'])

  if (booleanFields.has(fieldName)) {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === 'yes' || lower === '1') {
      return true
    }
    if (lower === 'false' || lower === 'no' || lower === '0') {
      return false
    }
  }

  // Default to string
  return value
}
