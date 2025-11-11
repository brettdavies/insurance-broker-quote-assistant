/**
 * Discount Engine Service
 *
 * Deterministic rules engine that evaluates discount eligibility and calculates savings
 * based on policy data and carrier discount rules from knowledge pack.
 *
 * 100% deterministic - no LLM calls, pure functions only.
 *
 * @see docs/architecture/6-components.md#64-discount-engine-deterministic
 */

import type { Carrier, PolicySummary, UserProfile } from '@repo/shared'
import { getFieldValue } from '../utils/field-helpers'
import { analyzeBundleOptions } from './discount-engine/bundle-analyzer'
import { getDiscountEvaluator } from './discount-engine/factory'
import type { BundleOpportunity, DiscountOpportunity } from './discount-engine/types'
import { createCitation } from './discount-engine/utils/citation'
import { filterByProductAndState } from './discount-engine/utils/filtering'
import { getEffectivePercentage } from './discount-engine/utils/percentage'

// Re-export types for external use
export type { DiscountOpportunity, BundleOpportunity } from './discount-engine/types'

/**
 * Find applicable discounts for a policy
 *
 * @param carrier - Carrier from knowledge pack
 * @param policy - Policy summary with carrier, state, product, premiums
 * @param customerData - Optional customer profile data for eligibility checks
 * @returns Array of discount opportunities with calculated savings
 */
export function findApplicableDiscounts(
  carrier: Carrier,
  policy: PolicySummary,
  customerData?: UserProfile
): DiscountOpportunity[] {
  if (!policy.state || !policy.productType) {
    return []
  }

  // Step 1: Filter discounts by product and state
  const candidateDiscounts = filterByProductAndState(
    carrier.discounts,
    policy.state,
    policy.productType
  )

  // Step 2: Evaluate requirements for each candidate using factory pattern
  const eligibleDiscounts = candidateDiscounts
    .map((discount) => {
      const evaluator = getDiscountEvaluator(discount)
      return evaluator.evaluateEligibility(discount, policy, customerData)
    })
    .filter((result) => result.eligible)

  // Step 3: Calculate savings for each eligible discount
  // Note: state and productType are guaranteed to be defined due to early return above
  const state = policy.state
  const productType = policy.productType
  return eligibleDiscounts.map((result) => {
    const evaluator = getDiscountEvaluator(result.discount)
    const savings = evaluator.calculateSavings(result.discount, policy, customerData)
    const effectivePercentage = getEffectivePercentage(result.discount, state, productType)

    return {
      discountId: result.discount._id,
      discountName: getFieldValue(result.discount.name, ''),
      percentage: effectivePercentage,
      annualSavings: savings.annualDollars,
      missingRequirements: result.missingRequirements,
      citation: createCitation(result.discount, carrier),
      stackable: getFieldValue(result.discount.stackable, true),
      requiresDocumentation: result.discount.metadata?.requiresDocumentation || false,
    }
  })
}

/**
 * Get effective discount percentage considering state and product variations
 *
 * @param discount - Discount from knowledge pack
 * @param state - State code (e.g., "CA", "TX")
 * @param product - Product type (e.g., "auto", "home")
 * @returns Effective percentage after applying variations
 */
export { getEffectivePercentage } from './discount-engine/utils/percentage'

/**
 * Analyze bundle opportunities for adding additional products
 *
 * @param carrier - Carrier from knowledge pack
 * @param policy - Current policy summary
 * @param customerData - Optional customer profile data
 * @returns Array of bundle opportunities
 */
export { analyzeBundleOptions } from './discount-engine/bundle-analyzer'
