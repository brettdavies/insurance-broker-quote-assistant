/**
 * Field List Utilities
 *
 * Utilities for getting lists of UserProfile field names.
 * Centralized to ensure consistency across frontend and backend.
 */

import { unifiedFieldMetadata } from '../../schemas/field-metadata'

/**
 * Get all UserProfile field names
 * Returns field names from unifiedFieldMetadata that apply to intake flow
 *
 * @returns Array of field names
 */
export function getAllUserProfileFieldNames(): string[] {
  const fieldNames: string[] = []

  for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
    // Only include fields that apply to intake flow
    if (metadata.flows.includes('intake')) {
      fieldNames.push(fieldName)
    }
  }

  return fieldNames
}
