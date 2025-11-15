/**
 * Requirement Queries
 *
 * Query functions for field requirement data from the knowledge pack.
 */

import { getState } from '../knowledge-pack-loader'
import { getCarrierByName } from './carrier-queries'
import { getStateByCode } from './state-queries'

/**
 * Get carrier-specific field requirements for a product
 *
 * Returns additional required fields based on carrier eligibility rules.
 * For example, if carrier requires clean driving record, adds 'cleanRecord3Yr' as critical.
 *
 * @param carrierName - Carrier name
 * @param productType - Product type ('auto', 'home', 'renters', 'umbrella')
 * @param stateCode - Optional state code for state-specific requirements
 * @returns Array of required field keys with priority
 */
export function getCarrierFieldRequirements(
  carrierName: string,
  productType: string,
  stateCode?: string
): Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> {
  const carrier = getCarrierByName(carrierName) // Use case-insensitive lookup
  if (!carrier) {
    return []
  }

  const requirements: Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> = []
  const eligibility = carrier.eligibility?.[productType as keyof typeof carrier.eligibility] as
    | {
        requiresCleanDrivingRecord?: { value?: boolean }
        minAge?: { value?: number }
        maxAge?: { value?: number }
        minCreditScore?: { value?: number }
        stateSpecific?: Record<string, unknown>
      }
    | undefined

  if (!eligibility) {
    return []
  }

  // Check for clean driving record requirement (auto only)
  if (productType === 'auto') {
    const requiresCleanRecord = eligibility.requiresCleanDrivingRecord?.value ?? false
    if (requiresCleanRecord) {
      requirements.push({ field: 'cleanRecord3Yr', priority: 'critical' })
    }
  }

  // Check for age requirements (adds age field as important if min/max age exists)
  if (eligibility.minAge?.value !== undefined || eligibility.maxAge?.value !== undefined) {
    requirements.push({ field: 'age', priority: 'important' })
  }

  // Check for credit score requirement
  if (eligibility.minCreditScore?.value !== undefined) {
    requirements.push({ field: 'creditScore', priority: 'important' })
  }

  // Check state-specific requirements
  if (stateCode && eligibility.stateSpecific?.[stateCode]) {
    const stateSpecific = eligibility.stateSpecific[stateCode] as Record<string, unknown>
    // Add any state-specific field requirements here
    // For now, we'll rely on state-level requirements
  }

  return requirements
}

/**
 * Get state-specific field requirements for a product
 *
 * Returns additional required fields based on state minimum coverage requirements.
 *
 * @param stateCode - State code
 * @param productType - Product type ('auto', 'home', 'renters', 'umbrella')
 * @returns Array of required field keys with priority
 */
export function getStateFieldRequirements(
  stateCode: string,
  productType: string
): Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> {
  const state = getStateByCode(stateCode) // Use case-insensitive lookup
  if (!state) {
    return []
  }

  const requirements: Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> = []

  // Check minimum coverage requirements
  const minimums = state.minimumCoverages?.[productType as keyof typeof state.minimumCoverages]

  if (productType === 'auto' && minimums) {
    // Auto insurance typically requires VIN for state minimums verification
    requirements.push({ field: 'vins', priority: 'important' })
  }

  if (productType === 'home' && minimums) {
    // Home insurance may require property details for state minimums
    requirements.push({ field: 'squareFeet', priority: 'important' })
    requirements.push({ field: 'yearBuilt', priority: 'important' })
  }

  // Check special requirements
  if (state.specialRequirements) {
    // State-specific requirements may add additional fields
    // For now, we'll rely on product-level defaults
  }

  return requirements
}
