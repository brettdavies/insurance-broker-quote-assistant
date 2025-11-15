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
import {
  checkFieldsAgainstRequirements,
  checkRequiredFields,
  getDefaultProductRequirements,
} from '@repo/shared'

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
 * @param productType - Optional product type (defaults to profile.productType)
 * @param state - Optional state code (defaults to profile.state)
 * @param carrier - Optional carrier name (not used in frontend, backend will reconcile)
 * @returns Array of missing field information
 */
export function calculateMissingFields(
  profile: UserProfile,
  productType?: string,
  state?: string,
  carrier?: string
): MissingFieldInfo[] {
  const product = productType || profile.productType

  // Check required fields for all products (from shared)
  const requiredMissing = checkRequiredFields(profile)

  // Get product-specific requirements (from shared defaults)
  const productRequirements = product ? getDefaultProductRequirements(product) : []
  const productMissing = checkFieldsAgainstRequirements(profile, productRequirements)

  // Combine and convert to frontend format (fieldKey instead of field)
  const allMissing = [...requiredMissing, ...productMissing]

  return allMissing.map((field) => ({
    fieldKey: field.field,
    priority: field.priority,
  }))
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
