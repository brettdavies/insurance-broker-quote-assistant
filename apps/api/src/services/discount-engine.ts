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

import type { Carrier, Discount, PolicySummary, UserProfile } from '@repo/shared'
import { getFieldValue } from '../utils/field-helpers'
import { analyzeBundleOptions } from './discount-engine/bundle-analyzer'
import { getDiscountEvaluator } from './discount-engine/factory'
import type {
  BundleOpportunity,
  DiscountOpportunity,
  DiscountRequirements,
} from './discount-engine/types'
import { createCitation } from './discount-engine/utils/citation'
import { filterByProductAndState } from './discount-engine/utils/filtering'
import { getEffectivePercentage } from './discount-engine/utils/percentage'

// Re-export types for external use
export type { DiscountOpportunity, BundleOpportunity } from './discount-engine/types'

/**
 * Build list of requirements customer meets (for eligible discounts)
 * @param discount - Discount from knowledge pack
 * @param policy - Policy summary
 * @param customerData - Optional customer profile data
 * @returns Array of human-readable requirement strings
 */
function buildMetRequirements(
  discount: Discount,
  policy: PolicySummary,
  customerData?: UserProfile
): string[] {
  const requirements = getFieldValue(discount.requirements, {}) as DiscountRequirements
  const met: string[] = []

  if (!customerData) {
    return met
  }

  // Check product requirements
  if (requirements.mustHaveProducts) {
    const existingProducts =
      customerData.existingPolicies?.map((p) => p.product).filter(Boolean) || []
    const currentProduct = policy.productType
    const allProducts = currentProduct ? [currentProduct, ...existingProducts] : existingProducts

    for (const product of requirements.mustHaveProducts) {
      if (allProducts.includes(product as 'auto' | 'home' | 'renters' | 'umbrella')) {
        met.push(`has ${product} insurance`)
      }
    }
  }

  // Check field requirements
  if (requirements.fieldRequirements) {
    const fieldReqs = requirements.fieldRequirements

    // Clean record (note: 5yr satisfies 3yr)
    if (fieldReqs.cleanRecord3Yr === true) {
      if (customerData.cleanRecord5Yr) {
        met.push('clean 5-year driving record (meets 3-year requirement)')
      } else if (customerData.cleanRecord3Yr) {
        met.push('clean 3-year driving record')
      }
    } else if (fieldReqs.cleanRecord5Yr === true) {
      if (customerData.cleanRecord5Yr) {
        met.push('clean 5-year driving record')
      }
    }

    // Age
    if (fieldReqs.age) {
      if (customerData.age !== undefined && customerData.age !== null) {
        const { min, max } = fieldReqs.age
        if (
          (min === undefined || customerData.age >= min) &&
          (max === undefined || customerData.age <= max)
        ) {
          met.push(`age ${customerData.age}`)
        }
      }
    }

    // Other boolean fields
    // Note: These fields are not currently in UserProfile schema - commenting out for type safety
    // TODO: Add these fields to UserProfile schema if needed
    // if (fieldReqs.goodStudent === true && customerData.goodStudent === true) {
    //   met.push('good student')
    // }
    // if (fieldReqs.military === true && customerData.military === true) {
    //   met.push('military')
    // }
    // if (fieldReqs.veteran === true && customerData.veteran === true) {
    //   met.push('veteran')
    // }
    // if (fieldReqs.homeSecuritySystem === true && customerData.homeSecuritySystem === true) {
    //   met.push('home security system')
    // }
    // if (fieldReqs.deadboltLocks === true && customerData.deadboltLocks === true) {
    //   met.push('deadbolt locks')
    // }
  }

  return met
}

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

    // Build metRequirements list (requirements customer meets)
    const metRequirements = buildMetRequirements(result.discount, policy, customerData)

    return {
      discountId: result.discount._id,
      discountName: getFieldValue(result.discount.name, ''),
      percentage: effectivePercentage,
      annualSavings: savings.annualDollars,
      missingRequirements: result.missingRequirements,
      metRequirements,
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
