/**
 * Missing Fields Utility
 *
 * Calculates missing fields from UserProfile (frontend version of backend logic).
 * Used to display missing fields in the UI even when intake endpoint hasn't been called.
 *
 * Note: Frontend uses basic product-level requirements for real-time calculation.
 * Backend reconciles with carrier/state-specific requirements after API call.
 *
 * @see apps/api/src/services/prefill-generator.ts:getMissingFields
 */

import type { MissingField, UserProfile } from '@repo/shared'

export interface MissingFieldInfo {
  fieldKey: string
  priority: 'critical' | 'important' | 'optional'
}

/**
 * Calculate missing fields from UserProfile
 *
 * Frontend version that uses basic product-level requirements for real-time calculation.
 * Backend will reconcile with carrier/state-specific requirements after API call.
 *
 * @param profile - User profile to check
 * @param productLine - Optional product line (defaults to profile.productLine)
 * @param state - Optional state code (defaults to profile.state)
 * @param carrier - Optional carrier name (not used in frontend, backend will reconcile)
 * @returns Array of missing field information
 */
export function calculateMissingFields(
  profile: UserProfile,
  productLine?: string,
  state?: string,
  carrier?: string
): MissingFieldInfo[] {
  const missing: MissingFieldInfo[] = []
  const product = productLine || profile.productLine

  // Required fields for all products
  if (!profile.state) {
    missing.push({ fieldKey: 'state', priority: 'critical' })
  }
  if (!profile.productLine) {
    missing.push({ fieldKey: 'productLine', priority: 'critical' })
  }

  // Product-specific required fields
  if (product === 'auto') {
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
  } else if (product === 'home') {
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
  } else if (product === 'renters') {
    if (!profile.propertyType) {
      missing.push({ fieldKey: 'propertyType', priority: 'critical' })
    }
  } else if (product === 'umbrella') {
    if (!profile.existingPolicies || profile.existingPolicies.length === 0) {
      missing.push({ fieldKey: 'existingPolicies', priority: 'critical' })
    }
  }

  // Note: Carrier/state-specific requirements are handled by backend after API call
  // Frontend uses basic product-level requirements for real-time calculation

  return missing
}

/**
 * Convert backend MissingField[] to frontend MissingFieldInfo[]
 *
 * Helper function to convert backend response format to frontend component format
 */
export function convertMissingFieldsToInfo(missingFields: MissingField[]): MissingFieldInfo[] {
  return missingFields.map((field) => ({
    fieldKey: field.field,
    priority: field.priority,
  }))
}
