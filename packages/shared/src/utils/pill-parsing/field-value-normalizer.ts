/**
 * Field Value Normalizer
 *
 * Common functions for normalizing field values during parsing.
 * Extracted from key-value-parser.ts to reduce duplication.
 */

import { normalizeState, unifiedFieldMetadata } from '../../index'
import { normalizeCarrierName } from '../field-normalization/normalizers/carrier-normalizer'

/**
 * Normalize state value to uppercase state code
 * Validates against valid US state codes
 *
 * @param value - State value to normalize
 * @returns Normalized state code (e.g., "CA") or null if invalid
 */
export function normalizeStateValue(value: string): string | null {
  const normalizedState = normalizeState(value)
  if (normalizedState) {
    return normalizedState
  }
  // If normalization fails, return null (invalid state)
  return null
}

/**
 * Normalize and validate productType enum value
 *
 * @param value - ProductType value to normalize
 * @returns Normalized productType value or null if invalid
 */
export function normalizeProductTypeValue(value: string): string | null {
  const metadata = unifiedFieldMetadata.productType
  const lowerValue = value.toLowerCase()

  // Check if value matches enum options
  if (metadata?.options?.includes(lowerValue)) {
    return lowerValue
  }

  // Try to normalize common variations (e.g., "renter" -> "renters")
  const normalized = lowerValue === 'renter' ? 'renters' : lowerValue
  if (metadata?.options?.includes(normalized)) {
    return normalized
  }

  // Invalid enum value
  return null
}

/**
 * Normalize field value based on field name
 * Validates enum fields against their options
 *
 * @param fieldName - Name of the field
 * @param value - Value to normalize
 * @returns Normalized value or null if invalid
 */
export function normalizeFieldValue(fieldName: string, value: string): string | null {
  const metadata = unifiedFieldMetadata[fieldName]

  // Handle state field (special case - uses normalizeState)
  if (fieldName === 'state') {
    return normalizeStateValue(value)
  }

  // Handle productType enum field
  if (fieldName === 'productType') {
    return normalizeProductTypeValue(value)
  }

  // Handle carrier field (special case - uses carrier normalizer)
  // Supports both 'currentCarrier' and 'carrier' alias
  if (fieldName === 'currentCarrier' || fieldName === 'carrier') {
    // Normalize carrier name using carrier normalizer
    // The normalizer handles common variations and abbreviations
    const normalized = normalizeCarrierName(value)
    // Return normalized value (normalizer always returns a value, even if not found in map)
    // For strict validation, we'd need to check against knowledge pack, but that's not available here
    // So we allow any value and normalize it
    return normalized
  }

  // For any other enum field, validate against options
  if (metadata?.options && metadata.options.length > 0) {
    // Normalize underscores to hyphens for propertyType and similar fields
    const normalizedValue = value.toLowerCase().replace(/_/g, '-')
    // Check if value matches enum options (case-insensitive)
    if (metadata.options.includes(normalizedValue)) {
      return normalizedValue
    }
    // Invalid enum value
    return null
  }

  // No normalization/validation needed for other fields
  return value
}
