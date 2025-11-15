/**
 * Discount Queries
 *
 * Query functions for discount-related data from the knowledge pack.
 */

import type { Carrier } from '@repo/shared'
import { getFieldValue } from '../../utils/field-helpers'
import { getAllCarriers } from '../knowledge-pack-loader'
import { getCarrierByName } from './carrier-queries'

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
