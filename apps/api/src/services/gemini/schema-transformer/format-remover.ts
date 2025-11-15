/**
 * Format Remover
 *
 * Removes format constraints from schema (especially email format).
 */

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
