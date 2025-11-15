/**
 * Field Extractor
 *
 * Extracts structured fields from parsed key-value pairs.
 * Handles type conversion (numeric, boolean, string).
 */

import { unifiedFieldMetadata } from '../../schemas/field-metadata'
import { normalizeFieldValue } from './field-value-normalizer'
import { buildFieldTypeConfig } from './key-value-parser'
import type { ParsedKeyValue } from './types'

/**
 * Extract structured fields from parsed key-value pairs
 *
 * @param parsed - Array of parsed key-value pairs
 * @param fieldTypeConfig - Optional field type configuration (if not provided, builds from metadata)
 * @returns Object mapping field names to values
 */
export function extractFields(
  parsed: ParsedKeyValue[],
  fieldTypeConfig?: ReturnType<typeof buildFieldTypeConfig>
): Record<string, string | number> {
  const fields: Record<string, string | number> = {}
  const config = fieldTypeConfig || buildFieldTypeConfig()

  for (const item of parsed) {
    if (item.validation === 'valid' && item.fieldName) {
      const normalizedKey = item.fieldName

      // Convert to number if it's a numeric field
      if (config.numericFields.has(normalizedKey)) {
        const numValue = Number.parseInt(item.value, 10)
        if (!Number.isNaN(numValue)) {
          fields[normalizedKey] = numValue
        }
      } else {
        // Normalize field values (state, productType, etc.)
        const normalizedValue = normalizeFieldValue(normalizedKey, item.value)
        if (normalizedValue === null) {
          // Invalid enum value - skip it
          continue
        }
        fields[normalizedKey] = normalizedValue
      }
    }
  }

  return fields
}
