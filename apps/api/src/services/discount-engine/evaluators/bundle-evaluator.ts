/**
 * Bundle Discount Evaluator
 *
 * Handles multi-policy bundle discounts
 */

import type { PolicySummary, UserProfile } from '@repo/shared'
import { getFieldValue } from '../../../utils/field-helpers'
import type { DiscountRequirements, SavingsCalculation } from '../types'
import { BaseDiscountEvaluator } from './base-evaluator'

/**
 * Bundle discount evaluator
 */
export class BundleDiscountEvaluator extends BaseDiscountEvaluator {
  protected calculateTypeSpecificSavings(
    discount: any,
    policy: PolicySummary,
    customerData: UserProfile | undefined,
    effectivePercentage: number
  ): SavingsCalculation {
    const requirements = getFieldValue(discount.requirements, {}) as DiscountRequirements

    const currentPremium = policy.premiums?.annual || 0

    // Bundle discounts apply to multiple products
    if (requirements.bundleProducts && requirements.bundleProducts.length > 1) {
      const bundleProducts = requirements.bundleProducts
      let totalBundlePremium = currentPremium

      // Add premiums from existing policies if they're part of the bundle
      if (customerData?.existingPolicies) {
        for (const existingPolicy of customerData.existingPolicies) {
          if (bundleProducts.includes(existingPolicy.product)) {
            totalBundlePremium += existingPolicy.premium
          }
        }
      }

      const bundleSavings = (totalBundlePremium * effectivePercentage) / 100
      return {
        annualDollars: bundleSavings,
        explanation: `${effectivePercentage}% off ${bundleProducts.join(' + ')} bundle`,
      }
    }

    // Fallback to single product calculation
    const annualSavings = (currentPremium * effectivePercentage) / 100
    return {
      annualDollars: annualSavings,
      explanation: `${effectivePercentage}% discount on ${policy.productType}`,
    }
  }
}
