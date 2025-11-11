/**
 * Missing Fields Utility
 *
 * Calculates missing fields from UserProfile (frontend version of backend logic).
 * Used to display missing fields in the UI even when intake endpoint hasn't been called.
 *
 * @see apps/api/src/services/prefill-generator.ts:getMissingFields
 */

import type { UserProfile } from '@repo/shared'

export interface MissingFieldInfo {
  fieldKey: string
  priority: 'critical' | 'important' | 'optional'
}

/**
 * Calculate missing fields from UserProfile
 *
 * @param profile - User profile to check
 * @returns Array of missing field information
 */
export function calculateMissingFields(profile: UserProfile): MissingFieldInfo[] {
  const missing: MissingFieldInfo[] = []

  // Required fields for all products
  if (!profile.state) {
    missing.push({ fieldKey: 'state', priority: 'critical' })
  }
  if (!profile.productLine) {
    missing.push({ fieldKey: 'productLine', priority: 'critical' })
  }

  // Product-specific required fields
  if (profile.productLine === 'auto') {
    if (!profile.vehicles) {
      missing.push({ fieldKey: 'vehicles', priority: 'critical' })
    }
    if (!profile.drivers) {
      missing.push({ fieldKey: 'drivers', priority: 'critical' })
    }
    if (!profile.vins) {
      missing.push({ fieldKey: 'vins', priority: 'important' })
    }
    if (!profile.garage) {
      missing.push({ fieldKey: 'garage', priority: 'optional' })
    }
  } else if (profile.productLine === 'home') {
    if (!profile.propertyType) {
      missing.push({ fieldKey: 'propertyType', priority: 'critical' })
    }
    if (!profile.constructionYear) {
      missing.push({ fieldKey: 'constructionYear', priority: 'important' })
    }
    if (!profile.squareFeet) {
      missing.push({ fieldKey: 'squareFeet', priority: 'important' })
    }
    if (!profile.roofType) {
      missing.push({ fieldKey: 'roofType', priority: 'optional' })
    }
  } else if (profile.productLine === 'renters') {
    if (!profile.propertyType) {
      missing.push({ fieldKey: 'propertyType', priority: 'critical' })
    }
  } else if (profile.productLine === 'umbrella') {
    if (!profile.existingPolicies || profile.existingPolicies.length === 0) {
      missing.push({ fieldKey: 'existingPolicies', priority: 'critical' })
    }
  }

  return missing
}
