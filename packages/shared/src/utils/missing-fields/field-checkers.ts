/**
 * Field Checkers
 *
 * Utilities for checking if field values are missing from a profile.
 */

import type { UserProfile } from '../../schemas/user-profile'

/**
 * Check if a field value is missing from profile
 *
 * Handles different value types:
 * - undefined/null/empty string = missing
 * - arrays: empty array = missing
 * - other types: falsy = missing
 *
 * @param profile - User profile to check
 * @param fieldName - Field name to check
 * @returns true if field is missing, false otherwise
 */
export function isFieldMissing(profile: UserProfile, fieldName: string): boolean {
  const fieldValue = profile[fieldName as keyof UserProfile]

  // Handle undefined/null/empty string
  if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
    return true
  }

  // Special handling for existingPolicies (array check)
  if (fieldName === 'existingPolicies') {
    const existingPolicies = profile.existingPolicies
    return !existingPolicies || existingPolicies.length === 0
  }

  return false
}

/**
 * Check multiple fields and return missing ones
 *
 * @param profile - User profile to check
 * @param requirements - Array of field requirements to check
 * @returns Array of missing field requirements
 */
export function checkFieldsAgainstRequirements(
  profile: UserProfile,
  requirements: Array<{ field: string; priority: 'critical' | 'important' | 'optional' }>
): Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> {
  const missing: Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> = []

  for (const req of requirements) {
    if (isFieldMissing(profile, req.field)) {
      missing.push(req)
    }
  }

  return missing
}
