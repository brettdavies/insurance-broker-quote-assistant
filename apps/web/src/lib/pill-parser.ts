/**
 * Pill Marker Parser
 *
 * Frontend utility for parsing pill markers [[key:value]] from processedText.
 * Uses centralized extraction engine (extractFieldsAndReplace) shared with backend.
 *
 * CRITICAL: Frontend NEVER generates UserProfile - it only parses pills from
 * processedText returned by centralized engine.
 */

import {
  PILL_MARKER_PATTERN,
  type ParsedKeyValue,
  type UserProfile,
  type ValidationResult,
  extractFieldsAndReplace,
  normalizeFieldValue,
  unifiedFieldMetadata,
} from '@repo/shared'
import { logWarn } from './logger'

// Re-export types
export type { ParsedKeyValue, ValidationResult }

/**
 * Validate a pill's field name and value
 *
 * @param fieldName - The field name to validate
 * @param value - The value to validate
 * @returns ValidationResult indicating if the pill is valid, has invalid key, or invalid value
 */
function validatePill(fieldName: string, value: string): ValidationResult {
  // Check if fieldName exists in unifiedFieldMetadata
  const metadata = unifiedFieldMetadata[fieldName]
  if (!metadata) {
    return 'invalid_key'
  }

  // Validate value based on field type
  if (metadata.fieldType === 'numeric') {
    // Check if value is a valid number
    const numValue = Number.parseInt(value, 10)
    if (Number.isNaN(numValue)) {
      return 'invalid_value'
    }

    // Check min/max constraints if specified
    if (metadata.min !== undefined && numValue < metadata.min) {
      return 'invalid_value'
    }
    if (metadata.max !== undefined && numValue > metadata.max) {
      return 'invalid_value'
    }

    return 'valid'
  }

  if (metadata.fieldType === 'boolean') {
    // Check if value is a valid boolean
    const lower = value.toLowerCase()
    const validBooleans = ['true', 'false', 'yes', 'no', '1', '0']
    if (!validBooleans.includes(lower)) {
      return 'invalid_value'
    }
    return 'valid'
  }

  // For enum fields (fields with options array), use normalizeFieldValue
  if (metadata.options && metadata.options.length > 0) {
    const normalized = normalizeFieldValue(fieldName, value)
    if (normalized === null) {
      return 'invalid_value'
    }
    return 'valid'
  }

  // For string fields, basic validation (non-empty)
  if (metadata.fieldType === 'string') {
    if (!value || value.trim() === '') {
      return 'invalid_value'
    }
    return 'valid'
  }

  // For other field types (date, object), basic non-empty check
  if (!value || value.trim() === '') {
    return 'invalid_value'
  }

  return 'valid'
}

/**
 * Extraction result from centralized engine
 * Includes pills for Lexical AND userProfile for state updates
 * userProfile contains known fields in main object, inferred fields in _inferred object
 */
export interface PillExtractionResult {
  pills: ParsedKeyValue[]
  userProfile: UserProfile
}

/**
 * Parse ALL fields from text using centralized extraction engine
 *
 * This function:
 * 1. Calls extractFieldsAndReplace() (shared FE/BE logic)
 * 2. Parses pill markers [[key:value]] from processedText
 * 3. Returns pills for Lexical + userProfile for state
 *
 * Examples:
 * Input:  "CA auto. Age 25. k:2"
 * Output: {
 *   pills: [{key: "state", value: "CA"}, {key: "product", value: "auto"}, ...],
 *   userProfile: {state: "CA", productType: "auto", age: 25, vehicles: 2}
 * }
 *
 * @param text - Text containing any combination of patterns
 * @returns Extraction result with pills and userProfile
 */
export function parseKeyValueSyntax(
  text: string,
  suppressedFields?: string[],
  pillFields?: Array<{ fieldName: string; value: unknown }>
): PillExtractionResult {
  try {
    console.log('[pill-parser] Input text:', text)
    console.log(
      '[pill-parser] Pill fields:',
      pillFields?.map((f) => `${f.fieldName}:${f.value}`).join(', ') || 'none'
    )

    // Call centralized extraction engine (same logic used by backend)
    // Pass suppressedFields so extraction engine can remove them
    // Pass pillFields so they can be included in known fields for inference
    const { processedText, userProfile, deterministicFields } = extractFieldsAndReplace(
      text,
      suppressedFields,
      pillFields
    )

    console.log('[pill-parser] ProcessedText:', processedText)
    console.log('[pill-parser] Deterministic fields count:', deterministicFields.length)
    console.log('[pill-parser] UserProfile:', userProfile)
    console.log(
      '[pill-parser] Known fields:',
      Object.keys(userProfile)
        .filter((k) => !k.startsWith('_'))
        .join(', ')
    )
    console.log(
      '[pill-parser] Inferred fields:',
      userProfile._inferred ? Object.keys(userProfile._inferred).join(', ') : 'none'
    )

    // Parse pill markers from processedText and map back to original text
    // CRITICAL: Only parse pills that correspond to deterministicFields (fields from text)
    // Pills from existing pills are already in the editor and don't need to be created
    // We need to map pill markers (e.g., [[kids:2]]) back to original text (e.g., k:2)
    // so that KeyValuePlugin can find them in the text nodes
    const pills = parsePillMarkers(processedText, deterministicFields)

    console.log('[pill-parser] Parsed pills count:', pills.length)

    return { pills, userProfile }
  } catch (error) {
    console.error('[pill-parser] ERROR:', error)
    logWarn('Failed to parse fields with centralized extraction engine', {
      error: error instanceof Error ? error.message : String(error),
      text,
    })
    return { pills: [], userProfile: {} }
  }
}

/**
 * Parse pill markers [[key:value]] from processedText
 *
 * Extracts all [[key:value]] patterns and converts to ParsedKeyValue format
 * for Lexical pill creation.
 *
 * CRITICAL: Maps pill markers back to original text so KeyValuePlugin can find them
 * in the text nodes. For example, [[kids:2]] → k:2 (original text from extraction).
 *
 * @param processedText - Text with pill markers
 * @param deterministicFields - Original extracted fields with originalText for mapping
 * @returns Array of parsed pills
 */
function parsePillMarkers(
  processedText: string,
  deterministicFields: Array<{ fieldName: string; value: unknown; originalText?: string }>
): ParsedKeyValue[] {
  const pills: ParsedKeyValue[] = []
  const regex = new RegExp(PILL_MARKER_PATTERN)

  // Build a map from fieldName:value to originalText for quick lookup
  // Only include fields from deterministicFields (fields from text, not from existing pills)
  const originalTextMap = new Map<string, string>()
  const fieldsFromTextSet = new Set<string>()
  for (const field of deterministicFields) {
    if (
      field.originalText &&
      !field.originalText.startsWith('(inferred') &&
      !field.originalText.startsWith('[inferred') &&
      !field.originalText.startsWith('[from pill:') // Exclude fields from existing pills
    ) {
      const key = `${field.fieldName}:${String(field.value)}`
      originalTextMap.set(key, field.originalText)
      fieldsFromTextSet.add(key)
    }
  }

  let match: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex exec pattern
  while ((match = regex.exec(processedText)) !== null) {
    const [fullMatch, key, value] = match

    // Skip if key or value is undefined (should never happen with our regex)
    if (!key || !value) {
      continue
    }

    // CRITICAL: Only include pills that correspond to fields from text (deterministicFields)
    // Pills from existing pills are already in the editor and don't need to be created
    const mapKey = `${key}:${value}`
    if (!fieldsFromTextSet.has(mapKey)) {
      // This pill is from an existing pill, skip it
      continue
    }

    // Map pill marker back to original text (e.g., [[kids:2]] → k:2)
    // This allows KeyValuePlugin to find the original text in the text nodes
    const originalText = originalTextMap.get(mapKey) || fullMatch

    // Validate the pill (key and value)
    const validation = validatePill(key, value)

    // Pill markers now contain resolved field names (e.g., [[kids:2]], not [[k:2]])
    pills.push({
      key,
      value,
      original: originalText, // Use original text from extraction, not pill marker
      validation,
      fieldName: key, // key is already the resolved field name
    })
  }

  return pills
}

/**
 * Extract structured fields from parsed key-value pairs
 *
 * @param parsed - Array of parsed key-value pairs
 * @returns Object mapping field names to values
 */
export function extractFields(parsed: ParsedKeyValue[]): Record<string, string | number> {
  const result: Record<string, string | number> = {}
  for (const item of parsed) {
    if (item.fieldName) {
      // Try to convert to number if possible
      const numValue = Number(item.value)
      result[item.fieldName] = Number.isNaN(numValue) ? item.value : numValue
    }
  }
  return result
}
