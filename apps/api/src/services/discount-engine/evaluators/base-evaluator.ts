/**
 * Base Discount Evaluator
 *
 * Abstract base class for discount type-specific evaluators
 */

import type { Discount, PolicySummary, UserProfile } from '@repo/shared'
import { getFieldValue } from '../../../utils/field-helpers'
import { checkFieldRequirements } from '../requirements/field-requirements'
import { checkProductRequirements } from '../requirements/product-requirements'
import type { DiscountEligibilityResult, DiscountRequirements, SavingsCalculation } from '../types'
import { getEffectivePercentage } from '../utils/percentage'

/**
 * Base evaluator interface
 */
export interface DiscountEvaluator {
  /**
   * Evaluate discount eligibility
   */
  evaluateEligibility(
    discount: Discount,
    policy: PolicySummary,
    customerData?: UserProfile
  ): DiscountEligibilityResult

  /**
   * Calculate discount savings
   */
  calculateSavings(
    discount: Discount,
    policy: PolicySummary,
    customerData?: UserProfile
  ): SavingsCalculation
}

/**
 * Base implementation of discount evaluator
 */
export abstract class BaseDiscountEvaluator implements DiscountEvaluator {
  /**
   * Evaluate discount eligibility
   */
  evaluateEligibility(
    discount: Discount,
    policy: PolicySummary,
    customerData?: UserProfile
  ): DiscountEligibilityResult {
    const requirements = getFieldValue(discount.requirements, {}) as DiscountRequirements

    const missingRequirements: string[] = []

    // Check product requirements (common to all discount types)
    missingRequirements.push(...checkProductRequirements(requirements, policy, customerData))

    // Check field requirements (if customer data provided)
    if (requirements.fieldRequirements) {
      if (customerData) {
        missingRequirements.push(...checkFieldRequirements(requirements, customerData))
      } else {
        missingRequirements.push('Customer profile data required for eligibility check')
      }
    }

    // Allow subclasses to add type-specific checks
    missingRequirements.push(
      ...this.checkTypeSpecificRequirements(discount, requirements, policy, customerData)
    )

    return {
      eligible: missingRequirements.length === 0,
      missingRequirements,
      discount,
    }
  }

  /**
   * Calculate discount savings
   */
  calculateSavings(
    discount: Discount,
    policy: PolicySummary,
    customerData?: UserProfile
  ): SavingsCalculation {
    if (!policy.state || !policy.productType) {
      return { annualDollars: 0, explanation: 'Invalid policy data' }
    }

    const effectivePercentage = getEffectivePercentage(discount, policy.state, policy.productType)

    return this.calculateTypeSpecificSavings(discount, policy, customerData, effectivePercentage)
  }

  /**
   * Check type-specific requirements (override in subclasses)
   */
  protected checkTypeSpecificRequirements(
    discount: Discount,
    requirements: DiscountRequirements,
    policy: PolicySummary,
    customerData?: UserProfile
  ): string[] {
    return []
  }

  /**
   * Calculate type-specific savings (override in subclasses)
   */
  protected abstract calculateTypeSpecificSavings(
    discount: Discount,
    policy: PolicySummary,
    customerData: UserProfile | undefined,
    effectivePercentage: number
  ): SavingsCalculation
}
