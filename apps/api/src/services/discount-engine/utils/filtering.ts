/**
 * Discount Filtering Utilities
 *
 * Filters discounts by product, state, and other criteria
 */

import type { Discount, PolicySummary } from '@repo/shared'
import { getFieldValue } from '../../../utils/field-helpers'

/**
 * Filter discounts by product and state
 *
 * @param discounts - Array of discounts to filter
 * @param state - State code
 * @param productType - Product type
 * @returns Filtered discounts that apply to the state and product
 */
export function filterByProductAndState(
  discounts: Discount[],
  state: string,
  productType: string
): Discount[] {
  return discounts.filter((discount) => {
    const discountProducts = getFieldValue(discount.products, [])
    const discountStates = getFieldValue(discount.states, [])

    return (
      discountProducts.includes(productType) &&
      discountStates.includes(state)
    )
  })
}

/**
 * Filter discounts by type
 *
 * @param discounts - Array of discounts to filter
 * @param discountType - Discount type to filter by
 * @returns Filtered discounts of the specified type
 */
export function filterByType(
  discounts: Discount[],
  discountType: 'bundle' | 'driver' | 'lifestyle' | 'loyalty' | 'other'
): Discount[] {
  return discounts.filter(
    (discount) => discount.metadata?.discountType === discountType
  )
}

