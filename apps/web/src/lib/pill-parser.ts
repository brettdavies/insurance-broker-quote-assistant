/**
 * Unified Field Extraction Parser
 *
 * Frontend wrapper around unified extraction orchestrator.
 * Extracts ALL patterns: key-value syntax, natural language, inference.
 *
 * Uses the SAME extraction logic as backend for consistency.
 */

import { type ParsedKeyValue, type ValidationResult, extractFieldsFrontend } from '@repo/shared'
import { logWarn } from './logger'

// Re-export types
export type { ParsedKeyValue, ValidationResult }

/**
 * Parse ALL fields from text using unified extraction orchestrator
 * Extracts: key-value syntax, natural language patterns, and inferred fields
 *
 * Examples:
 * - "state:IL" → {fieldName: "state", value: "IL"}
 * - "Age 36" → {fieldName: "age", value: 36}
 * - "3 drivers" → {fieldName: "drivers", value: 3} + inferred householdSize
 *
 * @param text - Text containing any combination of patterns
 * @returns Array of parsed fields with validation results
 */
export function parseKeyValueSyntax(text: string): ParsedKeyValue[] {
  try {
    console.log('[pill-parser] Input text:', text)
    const normalizedFields = extractFieldsFrontend(text)
    console.log('[pill-parser] Extracted fields count:', normalizedFields.length)
    console.log('[pill-parser] Extracted fields:', normalizedFields.map(f => `${f.fieldName}:${f.value}`).join(', '))

    const result = normalizedFields.map((field) => ({
      key: field.fieldName,
      value: String(field.value),
      original: field.originalText,
      validation: 'valid' as const,
      fieldName: field.fieldName,
    }))

    console.log('[pill-parser] Returning parsed fields:', result.length)
    return result
  } catch (error) {
    console.error('[pill-parser] ERROR:', error)
    logWarn('Failed to parse fields with unified extraction', {
      error: error instanceof Error ? error.message : String(error),
      text,
    })
    return []
  }
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
