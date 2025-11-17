/**
 * Pill Deduplication Utilities
 *
 * Handles deduplication logic for single-instance fields.
 * Used by frontend to prevent duplicate pills for fields that can only have one value.
 */

import { normalizeFieldName, unifiedFieldMetadata } from '../../index'
import type { ParsedKeyValue } from './types'

/**
 * Find existing single-instance fields in parsed results
 *
 * @param parsed - Array of parsed key-value pairs
 * @returns Map of normalized field names to parsed results (for single-instance fields only)
 */
export function findExistingSingleInstancePills(
  parsed: ParsedKeyValue[]
): Map<string, ParsedKeyValue> {
  const singleInstanceMap = new Map<string, ParsedKeyValue>()

  for (const result of parsed) {
    if (!result.fieldName) continue

    const normalizedFieldName = normalizeFieldName(result.fieldName)
    const metadata = unifiedFieldMetadata[normalizedFieldName]

    // Only track single-instance fields
    if (metadata?.singleInstance) {
      // If we already have this field, keep the first occurrence
      if (!singleInstanceMap.has(normalizedFieldName)) {
        singleInstanceMap.set(normalizedFieldName, result)
      }
    }
  }

  return singleInstanceMap
}

/**
 * Deduplicate parsed results for single-instance fields
 *
 * @param parsed - Array of parsed key-value pairs
 * @returns Deduplicated array (first occurrence kept, subsequent duplicates removed)
 */
export function deduplicateSingleInstanceFields(parsed: ParsedKeyValue[]): ParsedKeyValue[] {
  const seen = new Set<string>()
  const deduplicated: ParsedKeyValue[] = []

  for (const result of parsed) {
    if (!result.fieldName) {
      // No field name, always include
      deduplicated.push(result)
      continue
    }

    const normalizedFieldName = normalizeFieldName(result.fieldName)
    const metadata = unifiedFieldMetadata[normalizedFieldName]

    // Check if this is a single-instance field
    if (metadata?.singleInstance) {
      if (seen.has(normalizedFieldName)) {
        // Skip duplicate
        continue
      }
      seen.add(normalizedFieldName)
    }

    // Add result with normalized field name
    deduplicated.push({
      ...result,
      key: normalizedFieldName,
      fieldName: normalizedFieldName,
    })
  }

  return deduplicated
}
