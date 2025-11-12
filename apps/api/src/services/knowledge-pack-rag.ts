/**
 * Knowledge Pack RAG Service Interface
 *
 * Provides read-only query interface for knowledge pack data.
 * All queries read from in-memory Maps (no filesystem access).
 */

import type { Carrier, State } from '@repo/shared'
import { getFieldValue } from '../utils/field-helpers'
import {
  getAllCarriers,
  getAllStates,
  getCarrier,
  getProduct,
  getState,
} from './knowledge-pack-loader'

/**
 * Get a carrier by name (case-insensitive)
 *
 * @param name - Carrier name (e.g., "GEICO", "geico", "Progressive", "progressive")
 * @returns Carrier object or undefined if not found
 */
export function getCarrierByName(name: string): Carrier | undefined {
  // Case-insensitive lookup: find carrier by comparing names
  const allCarriers = getAllCarriers()
  return allCarriers.find((carrier) => carrier.name.toLowerCase() === name.toLowerCase())
}

/**
 * Get a state by code (case-insensitive, normalized to uppercase)
 *
 * @param code - Two-letter state code (e.g., "CA", "ca", "Tx", "fl")
 * @returns State object or undefined if not found
 */
export function getStateByCode(code: string): State | undefined {
  // Normalize to uppercase for lookup (state codes should be uppercase)
  return getState(code.toUpperCase())
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
 * Get a product by code
 *
 * @param code - Product code (e.g., "auto", "home", "renters", "umbrella")
 * @returns Product object or undefined if not found
 */
export function getProductByCode(code: string) {
  return getProduct(code)
}

/**
 * Get product-level field requirements
 *
 * Returns base required fields for a product type (e.g., auto requires vehicles, drivers).
 * These are product-level requirements that apply regardless of carrier or state.
 *
 * @param productType - Product type ('auto', 'home', 'renters', 'umbrella')
 * @returns Array of required field keys with priority
 */
export function getProductFieldRequirements(
  productType: string
): Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> {
  const product = getProduct(productType)
  if (!product || !product.requiredFields) {
    return []
  }

  const requiredFields = product.requiredFields.value
  if (!Array.isArray(requiredFields)) {
    return []
  }

  return requiredFields
}

/**
 * Check if a carrier operates in a specific state (case-insensitive)
 *
 * @param carrierName - Carrier name (case-insensitive)
 * @param stateCode - Two-letter state code (normalized to uppercase)
 * @returns true if carrier operates in state, false otherwise
 */
export function carrierOperatesInState(carrierName: string, stateCode: string): boolean {
  const carrier = getCarrierByName(carrierName) // Use case-insensitive lookup
  if (!carrier) {
    return false
  }

  const operatesIn = getFieldValue(carrier.operatesIn, [])
  // Normalize state code to uppercase for comparison
  return operatesIn.includes(stateCode.toUpperCase())
}

/**
 * Get all carriers that operate in a specific state (case-insensitive state code)
 *
 * @param stateCode - Two-letter state code (normalized to uppercase)
 * @returns Array of carrier names that operate in the state
 */
export function getCarriersForState(stateCode: string): string[] {
  const carriers = getAllCarriers()
  const normalizedStateCode = stateCode.toUpperCase()
  return carriers
    .filter((carrier) => {
      const operatesIn = getFieldValue(carrier.operatesIn, [])
      return operatesIn.includes(normalizedStateCode)
    })
    .map((carrier) => carrier.name)
}

/**
 * Get all products offered by a carrier (case-insensitive carrier name)
 *
 * @param carrierName - Carrier name (case-insensitive)
 * @returns Array of product names (e.g., ["auto", "home", "renters", "umbrella"])
 */
export function getCarrierProducts(carrierName: string): string[] {
  const carrier = getCarrierByName(carrierName) // Use case-insensitive lookup
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
    requirements.push({ field: 'constructionYear', priority: 'important' })
  }

  // Check special requirements
  if (state.specialRequirements) {
    // State-specific requirements may add additional fields
    // For now, we'll rely on product-level defaults
  }

  return requirements
}

/**
 * Get carrier discounts for a specific state and product
 *
 * Returns discounts that are applicable to the given state and product.
 * The engine will filter and evaluate these discounts based on policy data.
 *
 * @param carrierName - Carrier name
 * @param stateCode - Two-letter state code
 * @param productType - Product type ('auto', 'home', 'renters', 'umbrella')
 * @returns Array of discount objects with citations, or empty array if carrier not found
 */
export function getCarrierDiscounts(
  carrierName: string,
  stateCode: string,
  productType: string
): Carrier['discounts'] {
  const carrier = getCarrierByName(carrierName) // Use case-insensitive lookup
  if (!carrier) {
    return []
  }

  // Filter discounts by state and product
  // Normalize state code to uppercase for comparison
  const normalizedStateCode = stateCode.toUpperCase()
  return carrier.discounts.filter((discount) => {
    const discountProducts = getFieldValue(discount.products, [])
    const discountStates = getFieldValue(discount.states, [])

    return discountProducts.includes(productType) && discountStates.includes(normalizedStateCode)
  })
}

/**
 * Get carrier bundle discounts for a specific state
 *
 * Returns bundle discount rules (e.g., "auto + home = 15% off both").
 * Bundle discounts require multiple products to qualify.
 *
 * @param carrierName - Carrier name
 * @param stateCode - Two-letter state code
 * @returns Array of bundle discount objects, or empty array if carrier not found
 */
export function getCarrierBundleDiscounts(
  carrierName: string,
  stateCode: string
): Carrier['discounts'] {
  const carrier = getCarrierByName(carrierName) // Use case-insensitive lookup
  if (!carrier) {
    return []
  }

  // Filter for bundle discounts (require multiple products)
  // Normalize state code to uppercase for comparison
  const normalizedStateCode = stateCode.toUpperCase()
  return carrier.discounts.filter((discount) => {
    const discountStates = getFieldValue(discount.states, [])
    if (!discountStates.includes(normalizedStateCode)) {
      return false
    }

    // Check if it's a bundle discount by looking at requirements
    const requirements = getFieldValue(discount.requirements, {}) as {
      bundleProducts?: string[]
      mustHaveProducts?: string[]
      minProducts?: number
    }

    // Bundle discounts have bundleProducts with length > 1, or minProducts > 1
    return (
      (requirements.bundleProducts && requirements.bundleProducts.length > 1) ||
      (requirements.minProducts && requirements.minProducts > 1) ||
      (requirements.mustHaveProducts && requirements.mustHaveProducts.length > 1)
    )
  })
}

/**
 * Get discount by cuid2 ID
 *
 * Searches through all carriers to find a discount with the matching _id.
 *
 * @param discountId - Discount cuid2 ID
 * @returns Discount object with carrier context, or undefined if not found
 */
export function getDiscountById(
  discountId: string
): { discount: Carrier['discounts'][number]; carrier: Carrier } | undefined {
  const allCarriers = getAllCarriers()
  for (const carrier of allCarriers) {
    const discount = carrier.discounts.find((d) => d._id === discountId)
    if (discount) {
      return { discount, carrier }
    }
  }
  return undefined
}
