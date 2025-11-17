/**
 * Required Remover
 *
 * Removes all required arrays from schema to prevent forced field population.
 */

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
