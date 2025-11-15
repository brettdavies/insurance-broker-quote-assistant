/**
 * Null Enhancer
 *
 * Enhances JSON schema with null types and descriptions for optional fields.
 */

import { unifiedFieldMetadata } from '@repo/shared'

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
