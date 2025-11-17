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
  const processedRanges: Array<{ start: number; end: number }> = []

  // Helper to check if range overlaps with already processed ranges
  const isOverlapping = (start: number, end: number): boolean => {
    return processedRanges.some((range) => {
      return !(end <= range.start || start >= range.end)
    })
  }

  // Multi-word fields that allow spaces in values
  // These fields need special handling to allow spaces (e.g., "name:John Smith")
  const multiWordFields = new Set([
    'name',
    'phone',
    'drivingRecords',
    'deductibles',
    'limits',
    'vins',
  ])

  // Address field: allows spaces AND commas, only stops at period or newline
  // This is separate from multi-word fields because address needs to allow commas
  const addressFields = new Set(['address'])

  // Special pattern for email fields (requires valid email format with period in domain)
  // Matches: e:user@example.com or email:user@example.com
  // Word boundary \b ensures "e" only matches as complete word, not within "age" or "ownsHome"
  // Pattern requires: local part, @, domain with period, TLD (at least 2 chars)
  const emailPattern = /\b(e|email):([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi
  let emailMatch: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
  while ((emailMatch = emailPattern.exec(text)) !== null) {
    const fullMatch = emailMatch[0]
    const key = emailMatch[1]?.toLowerCase()
    const value = emailMatch[2]
    const startIndex = emailMatch.index
    const endIndex = startIndex + fullMatch.length

    if (!key || !value || isOverlapping(startIndex, endIndex)) {
      continue
    }

    fields.push({
      fieldName: 'email',
      value,
      originalText: fullMatch,
      startIndex,
      endIndex,
    })
    processedRanges.push({ start: startIndex, end: endIndex })
  }

  // Address field pattern (allows spaces AND commas, only stops at period/newline/end)
  // Pattern: key:value where value can contain spaces and commas, stops ONLY at period or newline
  // Does NOT stop at space or comma - only period or newline
  const addressPattern = /(\w+):(.+?)(?=\.|(?:\n)|$)/gi
  let addressMatch: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
  while ((addressMatch = addressPattern.exec(text)) !== null) {
    const fullMatch = addressMatch[0]
    const key = addressMatch[1]
    const value = addressMatch[2]
    const startIndex = addressMatch.index
    const endIndex = startIndex + fullMatch.length

    if (!key || !value || isOverlapping(startIndex, endIndex)) {
      continue
    }

    // Skip email patterns (already handled above)
    const lowerKey = key.toLowerCase()
    if (lowerKey === 'e' || lowerKey === 'email') {
      continue
    }

    // Resolve alias to canonical field name
    const fieldName = getFieldNameFromAlias(key)
    const finalFieldName = fieldName || key

    // Only process if this is an address field (check both resolved name and original key)
    const isAddressField =
      (fieldName && addressFields.has(fieldName)) || addressFields.has(key.toLowerCase())
    if (isAddressField) {
      // Parse value (handle numeric, boolean, string)
      const parsedValue = parseValue(value.trim(), fieldName || key)

      fields.push({
        fieldName: finalFieldName,
        value: parsedValue,
        originalText: fullMatch,
        startIndex,
        endIndex,
      })
      processedRanges.push({ start: startIndex, end: endIndex })
    }
  }

  // Multi-word field pattern (allows spaces, stops at comma/period/next key:value/end)
  // Pattern: key:value where value can contain spaces, stops at comma, period, newline, or next key:value pattern
  const multiWordPattern = /(\w+):((?:[^\s:,\.]+(?:\s+[^\s:,\.]+)*)+)(?=,|\.|(?:\s+\w+:)|$)/gi
  let multiWordMatch: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
  while ((multiWordMatch = multiWordPattern.exec(text)) !== null) {
    const fullMatch = multiWordMatch[0]
    const key = multiWordMatch[1]
    const value = multiWordMatch[2]
    const startIndex = multiWordMatch.index
    const endIndex = startIndex + fullMatch.length

    if (!key || !value || isOverlapping(startIndex, endIndex)) {
      continue
    }

    // Skip email patterns (already handled above)
    const lowerKey = key.toLowerCase()
    if (lowerKey === 'e' || lowerKey === 'email') {
      continue
    }

    // Resolve alias to canonical field name
    const fieldName = getFieldNameFromAlias(key)
    const finalFieldName = fieldName || key

    // Skip address fields (already handled above)
    if (fieldName && addressFields.has(fieldName)) {
      continue
    }

    // Only process if this is a multi-word field
    if (fieldName && multiWordFields.has(fieldName)) {
      // Parse value (handle numeric, boolean, string)
      const parsedValue = parseValue(value.trim(), fieldName)

      fields.push({
        fieldName: finalFieldName,
        value: parsedValue,
        originalText: fullMatch,
        startIndex,
        endIndex,
      })
      processedRanges.push({ start: startIndex, end: endIndex })
    }
  }

  // General key:value pattern (stops at space, comma, period)
  // This handles all non-email, non-multi-word fields
  const pattern = /(\w+):([^\s,.]+)/g

  let match: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
  while ((match = pattern.exec(text)) !== null) {
    const fullMatch = match[0]
    const key = match[1]
    const value = match[2]
    const startIndex = match.index
    const endIndex = startIndex + fullMatch.length

    // Skip if key or value is undefined, or already processed
    if (!key || !value || isOverlapping(startIndex, endIndex)) {
      continue
    }

    // Skip email patterns (already handled above)
    const lowerKey = key.toLowerCase()
    if (lowerKey === 'e' || lowerKey === 'email') {
      continue
    }

    // Resolve alias to canonical field name
    const fieldName = getFieldNameFromAlias(key)
    const finalFieldName = fieldName || key

    // Skip address fields (already handled above)
    if (fieldName && addressFields.has(fieldName)) {
      continue
    }

    // Skip multi-word fields (already handled above)
    if (fieldName && multiWordFields.has(fieldName)) {
      continue
    }

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
    processedRanges.push({ start: startIndex, end: endIndex })
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
