/**
 * Single Product Discount Evaluator
 *
 * Handles discounts that apply to a single product (driver, lifestyle, loyalty, etc.)
 */

import type { Discount, PolicySummary, UserProfile } from '@repo/shared'
import type { SavingsCalculation } from '../types'
import { BaseDiscountEvaluator } from './base-evaluator'

/**
 * Single product discount evaluator
 * Used for driver, lifestyle, loyalty, and other non-bundle discounts
 */
export class SingleProductDiscountEvaluator extends BaseDiscountEvaluator {
  protected calculateTypeSpecificSavings(
    discount: Discount,
    policy: PolicySummary,
    customerData: UserProfile | undefined,
    effectivePercentage: number
  ): SavingsCalculation {
    const currentPremium = policy.premiums?.annual || 0
    const annualSavings = (currentPremium * effectivePercentage) / 100

    return {
      annualDollars: annualSavings,
      explanation: `${effectivePercentage}% discount on ${policy.productType}`,
    }
  }
}
