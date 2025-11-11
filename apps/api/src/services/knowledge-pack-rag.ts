/**
 * Knowledge Pack RAG Service Interface
 *
 * Provides read-only query interface for knowledge pack data.
 * All queries read from in-memory Maps (no filesystem access).
 */

import type { Carrier, State } from '@repo/shared'
import { getFieldValue } from '../utils/field-helpers'
import { getAllCarriers, getAllStates, getCarrier, getState } from './knowledge-pack-loader'

/**
 * Get a carrier by name
 *
 * @param name - Carrier name (e.g., "GEICO", "Progressive", "State Farm")
 * @returns Carrier object or undefined if not found
 */
export function getCarrierByName(name: string): Carrier | undefined {
  return getCarrier(name)
}

/**
 * Get a state by code
 *
 * @param code - Two-letter state code (e.g., "CA", "TX", "FL")
 * @returns State object or undefined if not found
 */
export function getStateByCode(code: string): State | undefined {
  return getState(code)
}

/**
 * Get all carriers
 *
 * @returns Array of all loaded carriers
 */
export function getAllCarriersList(): Carrier[] {
  return getAllCarriers()
}

/**
 * Get all states
 *
 * @returns Array of all loaded states
 */
export function getAllStatesList(): State[] {
  return getAllStates()
}

/**
 * Check if a carrier operates in a specific state
 *
 * @param carrierName - Carrier name
 * @param stateCode - Two-letter state code
 * @returns true if carrier operates in state, false otherwise
 */
export function carrierOperatesInState(carrierName: string, stateCode: string): boolean {
  const carrier = getCarrier(carrierName)
  if (!carrier) {
    return false
  }

  const operatesIn = getFieldValue(carrier.operatesIn, [])
  return operatesIn.includes(stateCode)
}

/**
 * Get all carriers that operate in a specific state
 *
 * @param stateCode - Two-letter state code
 * @returns Array of carrier names that operate in the state
 */
export function getCarriersForState(stateCode: string): string[] {
  const carriers = getAllCarriers()
  return carriers
    .filter((carrier) => {
      const operatesIn = getFieldValue(carrier.operatesIn, [])
      return operatesIn.includes(stateCode)
    })
    .map((carrier) => carrier.name)
}

/**
 * Get all products offered by a carrier
 *
 * @param carrierName - Carrier name
 * @returns Array of product names (e.g., ["auto", "home", "renters", "umbrella"])
 */
export function getCarrierProducts(carrierName: string): string[] {
  const carrier = getCarrier(carrierName)
  if (!carrier) {
    return []
  }

  return getFieldValue(carrier.products, [])
}

/**
 * Get carrier-specific field requirements for a product
 *
 * Returns additional required fields based on carrier eligibility rules.
 * For example, if carrier requires clean driving record, adds 'cleanRecord3Yr' as critical.
 *
 * @param carrierName - Carrier name
 * @param productLine - Product line ('auto', 'home', 'renters', 'umbrella')
 * @param stateCode - Optional state code for state-specific requirements
 * @returns Array of required field keys with priority
 */
export function getCarrierFieldRequirements(
  carrierName: string,
  productLine: string,
  stateCode?: string
): Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> {
  const carrier = getCarrier(carrierName)
  if (!carrier) {
    return []
  }

  const requirements: Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> = []
  const eligibility = carrier.eligibility?.[productLine as keyof typeof carrier.eligibility] as
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
  if (productLine === 'auto') {
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
 * @param productLine - Product line ('auto', 'home', 'renters', 'umbrella')
 * @returns Array of required field keys with priority
 */
export function getStateFieldRequirements(
  stateCode: string,
  productLine: string
): Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> {
  const state = getState(stateCode)
  if (!state) {
    return []
  }

  const requirements: Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> = []

  // Check minimum coverage requirements
  const minimums = state.minimumCoverages?.[productLine as keyof typeof state.minimumCoverages]

  if (productLine === 'auto' && minimums) {
    // Auto insurance typically requires VIN for state minimums verification
    requirements.push({ field: 'vins', priority: 'important' })
  }

  if (productLine === 'home' && minimums) {
    // Home insurance may require property details for state minimums
    requirements.push({ field: 'squareFeet', priority: 'important' })
    requirements.push({ field: 'constructionYear', priority: 'important' })
  }

  // Check special requirements
  if (state.specialRequirements) {
    // State-specific requirements may add additional fields
    // For now, we'll rely on product-level defaults
  }

  return requirements
}
