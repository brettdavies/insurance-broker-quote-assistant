/**
 * Discount Evaluator Factory
 *
 * Factory pattern to select the appropriate evaluator based on discount type
 */

import type { Discount } from '@repo/shared'
import { getFieldValue } from '../../utils/field-helpers'
import type { DiscountEvaluator } from './evaluators/base-evaluator'
import { BundleDiscountEvaluator } from './evaluators/bundle-evaluator'
import { SingleProductDiscountEvaluator } from './evaluators/single-product-evaluator'
import type { DiscountRequirements } from './types'

/**
 * Get the appropriate evaluator for a discount
 *
 * @param discount - Discount to evaluate
 * @returns Discount evaluator instance
 */
export function getDiscountEvaluator(discount: Discount): DiscountEvaluator {
  // Check if it's a bundle discount by looking at requirements
  const requirements = getFieldValue(discount.requirements, {}) as DiscountRequirements

  if (requirements.bundleProducts && requirements.bundleProducts.length > 1) {
    return new BundleDiscountEvaluator()
  }

  // Check metadata for discount type
  const discountType = discount.metadata?.discountType

  // Bundle discounts use bundle evaluator
  if (discountType === 'bundle') {
    return new BundleDiscountEvaluator()
  }

  // All other discount types use single product evaluator
  // (driver, lifestyle, loyalty, other, or undefined)
  return new SingleProductDiscountEvaluator()
}
