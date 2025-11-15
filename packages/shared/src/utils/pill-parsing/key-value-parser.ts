/**
 * Key-Value Syntax Parser
 *
 * Parses key-value syntax from broker input (e.g., "kids:3", "k:3", "deps:4")
 * and validates against known field keys.
 *
 * This is a shared utility used by both frontend and backend.
 */

import { extractNormalizedFields, normalizeFieldName, unifiedFieldMetadata } from '../../index'
import type { NormalizedField } from '../../utils/field-normalization'
import { buildFieldAliasesMap, getFieldNameFromAlias } from './field-name-resolver'
import type { ParsedKeyValue, ValidationResult } from './types'

/**
 * Field type configuration for parsing
 */
export interface FieldTypeConfig {
  /** Fields that allow spaces (multi-word values) */
  multiWordFields: Set<string>
  /** Fields that are numeric */
  numericFields: Set<string>
  /** Fields with special character requirements */
  specialCharFields: Record<string, string[]>
}

/**
 * Build field type configuration from unifiedFieldMetadata
 */
export function buildFieldTypeConfig(): FieldTypeConfig {
  const multiWordFields = new Set<string>()
  const numericFields = new Set<string>()
  const specialCharFields: Record<string, string[]> = {}

  for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
    // Determine multi-word fields (fields that commonly have spaces in values)
    // This is a heuristic based on field names and types
    if (
      fieldName === 'name' ||
      fieldName === 'phone' ||
      fieldName === 'productType' ||
      fieldName === 'propertyType' ||
      fieldName === 'garage' ||
      fieldName === 'roofType' ||
      fieldName === 'drivingRecords' ||
      fieldName === 'deductibles' ||
      fieldName === 'limits' ||
      fieldName === 'existingPolicies' ||
      fieldName === 'vins'
    ) {
      multiWordFields.add(fieldName)
    }

    // Determine numeric fields
    if (metadata.fieldType === 'numeric') {
      numericFields.add(fieldName)
    }

    // Special character fields
    if (fieldName === 'phone') {
      specialCharFields[fieldName] = ['-', '(', ')', ' ']
    } else if (fieldName === 'zip') {
      specialCharFields[fieldName] = ['-']
    } else if (fieldName === 'email') {
      specialCharFields[fieldName] = ['.']
    }
  }

  return {
    multiWordFields,
    numericFields,
    specialCharFields,
  }
}

/**
 * Parse key-value syntax from text
 * Also includes natural language normalization (e.g., "2 drivers" → householdSize:2)
 *
 * @param text - Text containing key-value pairs (e.g., "Client needs auto, k:2 v:3")
 * @param validKeys - Optional set of valid keys (if not provided, uses all known aliases)
 * @param fieldTypeConfig - Optional field type configuration (if not provided, builds from metadata)
 * @param aliasesMap - Optional pre-built aliases map (for performance)
 * @returns Array of parsed key-value pairs with validation results
 */
export function parseKeyValueSyntax(
  text: string,
  validKeys?: Set<string>,
  fieldTypeConfig?: FieldTypeConfig,
  aliasesMap?: Record<string, string>
): ParsedKeyValue[] {
  const results: ParsedKeyValue[] = []
  const aliases = aliasesMap || buildFieldAliasesMap()
  const knownKeys = validKeys || new Set(Object.keys(aliases))
  const config = fieldTypeConfig || buildFieldTypeConfig()

  const processedRanges: Array<{ start: number; end: number }> = []

  // Track single-instance fields to handle deduplication
  // Map: normalizedFieldName -> index in results array
  const singleInstanceFieldIndices = new Map<string, number>()

  // Helper function to add result with deduplication for single-instance fields
  const addResult = (result: ParsedKeyValue) => {
    if (!result.fieldName) {
      // No field name, just add it
      results.push(result)
      return
    }

    // Normalize field name to element name from field-metadata
    const normalizedFieldName = normalizeFieldName(result.fieldName)
    const metadata = unifiedFieldMetadata[normalizedFieldName]

    // Check if this is a single-instance field
    if (metadata?.singleInstance) {
      const existingIndex = singleInstanceFieldIndices.get(normalizedFieldName)
      if (existingIndex !== undefined) {
        // Update existing result instead of creating new one
        results[existingIndex] = {
          ...result,
          key: normalizedFieldName, // Use normalized field name as key for display
          fieldName: normalizedFieldName, // Ensure normalized field name
        }
        return
      }
      // First occurrence, track it
      singleInstanceFieldIndices.set(normalizedFieldName, results.length)
    }

    // Add new result with normalized field name
    // Also normalize the key to use fieldName for display (so shortcuts like 'h' show as 'householdSize')
    results.push({
      ...result,
      key: normalizedFieldName, // Use normalized field name as key for display
      fieldName: normalizedFieldName,
    })
  }

  // Step 1: Parse key-value syntax FIRST (e.g., "k:3", "kids:2", "productType:renters")
  // This ensures explicit key-value pairs take precedence over pattern matching
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
    const matchStart = match.index ?? 0
    const matchEnd = matchStart + original.length

    if (isAlreadyProcessed(matchStart, matchEnd)) return false

    const fieldName = getFieldNameFromAlias(key, aliases)
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
        return config.multiWordFields.has(key) && key !== 'phone'
      })
    ) {
      const original = match[0]
      const key = match[1]?.toLowerCase() ?? ''
      const value = match[2] ?? ''
      const matchStart = match.index ?? 0
      const matchEnd = matchStart + original.length
      const fieldName = getFieldNameFromAlias(key, aliases)
      const normalizedKey = fieldName || key

      addResult({
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

      addResult({
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

      addResult({
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

      addResult({
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
    const matchStart = match.index ?? 0
    const matchEnd = matchStart + original.length

    // Skip if already processed by a specialized pattern
    if (isAlreadyProcessed(matchStart, matchEnd)) {
      match = otherPattern.exec(text)
      continue
    }

    // Resolve field name from alias
    const fieldName = getFieldNameFromAlias(key, aliases)
    const normalizedKey = fieldName || key

    // Check if key is valid
    const isValidKey = knownKeys.has(key) || (fieldName ? knownKeys.has(fieldName) : false)

    if (!isValidKey) {
      addResult({
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
      config.multiWordFields.has(normalizedKey)
    ) {
      match = otherPattern.exec(text)
      continue
    }

    // Validate value type for numeric fields
    if (config.numericFields.has(normalizedKey)) {
      // Remove commas for parsing (e.g., "1,200" -> 1200)
      const numValue = Number.parseInt(value.replace(/,/g, ''), 10)
      if (Number.isNaN(numValue)) {
        addResult({
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

    addResult({
      key,
      value,
      original,
      validation: 'valid',
      fieldName: normalizedKey,
    })

    match = otherPattern.exec(text)
  }

  // Step 2: Extract normalized fields from natural language patterns
  // This runs AFTER key-value parsing so explicit key-value pairs take precedence
  // Extract direct fields: "2 drivers" → drivers: 2, "2 kids" → kids: 2, "renter" → productType: renters, etc.
  try {
    const normalizedFields = extractNormalizedFields(text)

    // Convert normalized fields to parsed key-value format
    for (const field of normalizedFields) {
      // Check if field is in known keys
      if (knownKeys.has(field.fieldName)) {
        // Skip if this range was already processed by key-value parsing
        if (isAlreadyProcessed(field.startIndex, field.endIndex)) {
          continue
        }

        const key = field.fieldName
        const value = String(field.value)

        addResult({
          key,
          value,
          original: field.originalText,
          validation: 'valid',
          fieldName: field.fieldName,
        })

        // Track processed range to avoid duplicate extraction
        processedRanges.push({ start: field.startIndex, end: field.endIndex })
      }
    }
  } catch (error) {
    // If extraction fails, silently continue with key-value parsing results
    // Frontend will log warnings, backend will handle errors differently
  }

  // NOTE: householdSize inference is now handled exclusively by InferenceEngine
  // No manual inference here.

  return results
}
