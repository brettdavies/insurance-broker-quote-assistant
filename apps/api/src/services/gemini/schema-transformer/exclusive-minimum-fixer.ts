/**
 * Exclusive Minimum Fixer
 *
 * Fixes exclusiveMinimum -> minimum conversion for Gemini API compatibility.
 */

import { unifiedFieldMetadata } from '@repo/shared'

/**
 * Fix exclusiveMinimum -> minimum conversion for Gemini compatibility
 * Gemini API doesn't accept exclusiveMinimum, so we convert to minimum
 * Uses metadata min/max values when available, otherwise fixes integer minimums
 */
export function fixExclusiveMinimumForGemini(
  schema: Record<string, unknown>,
  fieldPath: string[] = []
): Record<string, unknown> {
  if (typeof schema !== 'object' || schema === null) {
    return schema
  }

  const fixed = { ...schema }

  // Fix properties
  if (fixed.properties && typeof fixed.properties === 'object') {
    const properties = fixed.properties as Record<string, unknown>
    const fixedProperties: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'object' && value !== null) {
        const prop = value as Record<string, unknown>
        const fixedProp = { ...prop }

        // Get metadata for this field (check nested fields if in a nested path)
        let fieldMetadata = unifiedFieldMetadata[key]
        if (fieldPath.length > 0) {
          // Try to find nested field metadata
          const parentKey = fieldPath[fieldPath.length - 1]
          if (parentKey) {
            const parentMetadata = unifiedFieldMetadata[parentKey]
            if (parentMetadata?.nestedFields?.[key]) {
              fieldMetadata = parentMetadata.nestedFields[key]
            }
          }
        }

        // Determine if this is an integer type
        const isInteger =
          fixedProp.type === 'integer' ||
          (Array.isArray(fixedProp.type) && fixedProp.type.includes('integer'))

        // Always remove exclusiveMinimum (Gemini doesn't accept it)
        // Convert to minimum only if metadata doesn't provide min value
        if ('exclusiveMinimum' in fixedProp) {
          if (fieldMetadata?.min === undefined) {
            // Convert exclusiveMinimum to minimum
            // Zod's .positive() creates exclusiveMinimum: true (boolean) or exclusiveMinimum: 0 (number)
            // Gemini doesn't accept exclusiveMinimum, so convert to minimum
            if (typeof fixedProp.exclusiveMinimum === 'number') {
              // For integers, use 0 instead of 0.0001
              fixedProp.minimum = isInteger ? 0 : fixedProp.exclusiveMinimum + 0.0001
            } else if (fixedProp.exclusiveMinimum === true) {
              // exclusiveMinimum: true means > 0, so use minimum: 0 for integers, 0.0001 for numbers
              fixedProp.minimum = isInteger ? 0 : 0.0001
            }
          }
          // Always remove exclusiveMinimum property
          fixedProp.exclusiveMinimum = undefined
        }

        // Apply metadata min/max (always takes precedence)
        if (fieldMetadata?.min !== undefined) {
          fixedProp.minimum = fieldMetadata.min
        } else if (fixedProp.minimum === 0.0001 || fixedProp.minimum === 0.00010000000000000002) {
          // Fix minimums that were incorrectly set to 0.0001 (or floating point equivalent)
          // For numbers (like premium amounts), use 0 instead of 0.0001
          // For integers, also use 0
          fixedProp.minimum = 0
        }

        // Special case: premium fields in existingPolicies should have minimum 0
        // (not 0.0001 from .positive() conversion)
        if (
          key === 'premium' &&
          (fixedProp.minimum === 0.0001 || fixedProp.minimum === 0.00010000000000000002)
        ) {
          fixedProp.minimum = 0
        }

        // Apply metadata max if available
        if (fieldMetadata?.max !== undefined) {
          fixedProp.maximum = fieldMetadata.max
        }

        fixedProperties[key] = fixExclusiveMinimumForGemini(fixedProp, [...fieldPath, key])
      } else {
        fixedProperties[key] = value
      }
    }

    fixed.properties = fixedProperties
  }

  // Recursively fix nested schemas
  if (fixed.items && typeof fixed.items === 'object') {
    fixed.items = fixExclusiveMinimumForGemini(fixed.items as Record<string, unknown>, fieldPath)
  }

  return fixed
}
