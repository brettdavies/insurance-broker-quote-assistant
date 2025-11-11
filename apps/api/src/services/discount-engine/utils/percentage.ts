/**
 * Percentage Calculation Utilities
 *
 * Handles state and product-specific percentage variations
 */

import type { Discount } from '@repo/shared'
import { getFieldValue } from '../../../utils/field-helpers'

/**
 * Get effective discount percentage considering state and product variations
 *
 * @param discount - Discount from knowledge pack
 * @param state - State code (e.g., "CA", "TX")
 * @param product - Product type (e.g., "auto", "home")
 * @returns Effective percentage after applying variations
 */
export function getEffectivePercentage(
  discount: Discount,
  state: string,
  product: string
): number {
  const basePercentage = getFieldValue(discount.percentage, 0)

  // Check state variations first
  if (discount.stateVariations?.[state]) {
    const stateVariation = discount.stateVariations[state]
    if (stateVariation.multiplier !== undefined) {
      return basePercentage * stateVariation.multiplier
    }
    if (stateVariation.percentage !== undefined) {
      return stateVariation.percentage
    }
  }

  // Check product variations
  if (discount.productVariations?.[product]) {
    const productVariation = discount.productVariations[product]
    if (productVariation.percentage !== undefined) {
      return productVariation.percentage
    }
  }

  // Default to base percentage
  return basePercentage
}

