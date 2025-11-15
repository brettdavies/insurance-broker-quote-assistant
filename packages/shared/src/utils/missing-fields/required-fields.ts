/**
 * Required Fields Checker
 *
 * Checks for required fields that are needed for all products.
 */

import type { MissingField } from '../../schemas/missing-field'
import type { UserProfile } from '../../schemas/user-profile'

/**
 * Required fields for all products
 */
export const REQUIRED_FIELDS: Array<keyof UserProfile> = ['state', 'productType', 'age'] as const

/**
 * Check for missing required fields
 *
 * @param profile - User profile to check
 * @returns Array of missing required fields
 */
export function checkRequiredFields(profile: UserProfile): MissingField[] {
  const missing: MissingField[] = []

  if (!profile.state) {
    missing.push({ field: 'state', priority: 'critical' })
  }
  if (!profile.productType) {
    missing.push({ field: 'productType', priority: 'critical' })
  }
  if (!profile.age) {
    missing.push({ field: 'age', priority: 'critical' })
  }

  return missing
}
