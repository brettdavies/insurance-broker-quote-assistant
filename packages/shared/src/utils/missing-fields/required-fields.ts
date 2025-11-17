/**
 * Required Fields Checker
 *
 * Checks for required fields that are needed for all products.
 * Derives always-required fields from field metadata instead of hardcoding.
 */

import { unifiedFieldMetadata } from '../../schemas/field-metadata'
import type { MissingField } from '../../schemas/missing-field'
import type { UserProfile } from '../../schemas/user-profile'
import { isFieldMissing } from './field-checkers'

/**
 * Check for missing required fields
 *
 * Iterates through field metadata to find fields marked as `alwaysRequired`
 * and checks if they are missing from the profile.
 *
 * @param profile - User profile to check
 * @returns Array of missing required fields with priorities from metadata
 */
export function checkRequiredFields(profile: UserProfile): MissingField[] {
  const missing: MissingField[] = []

  // Iterate through all fields in metadata
  for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
    // Check if field is marked as always required
    if (metadata.alwaysRequired) {
      // Check if field is actually missing from profile
      if (isFieldMissing(profile, fieldName)) {
        missing.push({
          field: fieldName,
          priority: metadata.alwaysRequired.priority,
        })
      }
    }
  }

  return missing
}
