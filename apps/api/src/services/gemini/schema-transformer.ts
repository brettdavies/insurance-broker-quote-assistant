/**
 * Schema Transformer
 *
 * Handles transformation of Zod JSON schemas for Gemini API compatibility.
 * Single Responsibility: Schema transformation and enhancement
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

/**
 * Remove all required arrays from schema (set to empty array)
 * This prevents forced field population that causes hallucinations
 * Only sets required on object schemas that have properties, not on individual property definitions
 */
export function removeRequiredArrays(schema: Record<string, unknown>): Record<string, unknown> {
  if (typeof schema !== 'object' || schema === null) {
    return schema
  }

  const cleaned = { ...schema }

  // Only set required on object schemas that have properties (not on individual property definitions)
  // Object schemas have "properties", property definitions have "type"
  if ('properties' in cleaned && typeof cleaned.properties === 'object') {
    // This is an object schema with properties, so set required to empty array
    cleaned.required = []
  } else {
    // This is NOT an object schema (it's a property definition or other schema type)
    // Remove required if it exists (it shouldn't be here)
    if ('required' in cleaned) {
      cleaned.required = undefined
    }
  }

  // Recursively process properties
  if (cleaned.properties && typeof cleaned.properties === 'object') {
    const properties = cleaned.properties as Record<string, unknown>
    const cleanedProperties: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        // When processing individual properties, they will have "type" not "properties",
        // so they won't get required added
        cleanedProperties[key] = removeRequiredArrays(value as Record<string, unknown>)
      } else {
        cleanedProperties[key] = value
      }
    }

    cleaned.properties = cleanedProperties
  }

  // Recursively process array items
  if (cleaned.items && typeof cleaned.items === 'object') {
    cleaned.items = removeRequiredArrays(cleaned.items as Record<string, unknown>)
  }

  return cleaned
}

/**
 * Remove format constraints from schema (especially email format)
 */
export function removeFormatConstraints(schema: Record<string, unknown>): Record<string, unknown> {
  if (typeof schema !== 'object' || schema === null) {
    return schema
  }

  const cleaned = { ...schema }

  // Remove format property
  if ('format' in cleaned) {
    cleaned.format = undefined
  }

  // Recursively process properties
  if (cleaned.properties && typeof cleaned.properties === 'object') {
    const properties = cleaned.properties as Record<string, unknown>
    const cleanedProperties: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'object' && value !== null) {
        cleanedProperties[key] = removeFormatConstraints(value as Record<string, unknown>)
      } else {
        cleanedProperties[key] = value
      }
    }

    cleaned.properties = cleanedProperties
  }

  // Recursively process array items
  if (cleaned.items && typeof cleaned.items === 'object') {
    cleaned.items = removeFormatConstraints(cleaned.items as Record<string, unknown>)
  }

  return cleaned
}

/**
 * Enhance JSON schema with null types and descriptions for optional fields
 * - Adds "null" to type array for optional fields
 * - Adds description from unifiedFieldMetadata if available
 * - Adds stronger "DO NOT infer" language to premium-related fields
 */
export function enhanceSchemaWithNullAndDescriptions(
  schema: Record<string, unknown>,
  fieldPath: string[] = []
): Record<string, unknown> {
  if (typeof schema !== 'object' || schema === null) {
    return schema
  }

  const enhanced = { ...schema }

  // Enhance properties
  if (enhanced.properties && typeof enhanced.properties === 'object') {
    const properties = enhanced.properties as Record<string, unknown>
    const enhancedProperties: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'object' && value !== null) {
        const prop = value as Record<string, unknown>
        const enhancedProp = { ...prop }

        // Add null to type for optional fields
        // Optional fields in Zod become optional in JSON schema, but we want explicit null type
        if ('type' in enhancedProp) {
          const currentType = enhancedProp.type
          if (typeof currentType === 'string') {
            // Convert single type to array with null
            enhancedProp.type = [currentType, 'null']
          } else if (Array.isArray(currentType)) {
            // Add null if not already present
            if (!currentType.includes('null')) {
              enhancedProp.type = [...currentType, 'null']
            }
          }
        }

        // Add null to enum arrays for productType, propertyType, and existingPolicies.items.product
        // This makes null a valid enum value, reducing pressure to pick a value
        if ('enum' in enhancedProp && Array.isArray(enhancedProp.enum)) {
          const enumValues = enhancedProp.enum as unknown[]
          if (!enumValues.includes(null)) {
            enhancedProp.enum = [...enumValues, null]
          }
        }

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

        // Check if this is a premium-related field
        const isPremiumField =
          key === 'premiums' ||
          fieldPath.includes('premiums') ||
          ['annual', 'monthly', 'semiAnnual'].includes(key)

        // Add description from unifiedFieldMetadata if available
        if (fieldMetadata) {
          // Build description: use description field, fallback to label
          const baseDescription = fieldMetadata.description || fieldMetadata.label
          // Remove trailing punctuation if present
          const cleanDescription = baseDescription.replace(/[.,;:!?]+$/, '')

          if (isPremiumField) {
            // Stronger language for premium fields
            enhancedProp.description = `${cleanDescription}. Populate ONLY if explicitly stated as a number. Do NOT calculate or infer. MUST be null if not explicitly mentioned.`
          } else {
            enhancedProp.description = `${cleanDescription}. MUST be null if not explicitly mentioned.`
          }
        } else if (!enhancedProp.description) {
          // If no metadata, add generic description
          if (isPremiumField) {
            enhancedProp.description =
              'Populate ONLY if explicitly stated. Do NOT calculate or infer. MUST be null if not explicitly mentioned.'
          } else {
            enhancedProp.description = 'MUST be null if not explicitly mentioned.'
          }
        }

        // Recursively enhance nested schemas
        enhancedProperties[key] = enhanceSchemaWithNullAndDescriptions(enhancedProp, [
          ...fieldPath,
          key,
        ])
      } else {
        enhancedProperties[key] = value
      }
    }

    enhanced.properties = enhancedProperties
  }

  // Add description to premiums object itself
  if (enhanced.properties && typeof enhanced.properties === 'object') {
    const properties = enhanced.properties as Record<string, unknown>
    if (
      'premiums' in properties &&
      typeof properties.premiums === 'object' &&
      properties.premiums !== null
    ) {
      const premiumsProp = properties.premiums as Record<string, unknown>
      if (!premiumsProp.description) {
        premiumsProp.description =
          'Premium amounts. Populate ONLY fields with explicit stated values. Do NOT calculate or infer.'
      }
    }
  }

  // Recursively enhance nested schemas (arrays, etc.)
  if (enhanced.items && typeof enhanced.items === 'object') {
    enhanced.items = enhanceSchemaWithNullAndDescriptions(
      enhanced.items as Record<string, unknown>,
      fieldPath
    )
  }

  return enhanced
}

/**
 * Transform schema for Gemini API compatibility
 * Applies all transformations:
 * 1. Remove all required arrays (set to empty array)
 * 2. Fix exclusiveMinimum -> minimum conversion (use metadata min/max when available)
 * 3. Remove format constraints (especially email)
 * 4. Enhance with null types and descriptions
 */
export function transformSchemaForGemini(schema: Record<string, unknown>): Record<string, unknown> {
  // Step 1: Remove all required arrays first
  let transformed = removeRequiredArrays(schema)

  // Step 2: Fix exclusiveMinimum and apply metadata min/max
  transformed = fixExclusiveMinimumForGemini(transformed)

  // Step 3: Remove format constraints
  transformed = removeFormatConstraints(transformed)

  // Step 4: Enhance with null types and descriptions
  transformed = enhanceSchemaWithNullAndDescriptions(transformed)

  return transformed
}
