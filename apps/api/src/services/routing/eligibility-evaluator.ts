/**
 * Eligibility Evaluator
 *
 * Evaluates eligibility for carriers based on product-specific rules.
 */

import type { Carrier, UserProfile } from '@repo/shared'
import { defaultEvaluatorFactory } from './eligibility/evaluator-factory'

/**
 * Eligibility evaluation result
 */
export interface EligibilityResult {
  eligible: boolean
  missingFields: string[]
  explanation: string
}

/**
 * Evaluate eligibility for a carrier based on product-specific rules
 *
 * Uses strategy pattern with evaluator factory to allow extensible eligibility checks.
 * New eligibility rules can be added by registering new evaluators without modifying this function.
 *
 * @param carrier - Carrier to evaluate
 * @param profile - User profile with eligibility fields
 * @param evaluatorFactory - Optional evaluator factory (defaults to defaultEvaluatorFactory)
 * @returns EligibilityResult with eligible flag, missing fields, and explanation
 */
export function evaluateEligibility(
  carrier: Carrier,
  profile: UserProfile,
  evaluatorFactory = defaultEvaluatorFactory
): EligibilityResult {
  if (!profile.productType) {
    return {
      eligible: false,
      missingFields: ['productType'],
      explanation: 'Product type is required for eligibility evaluation',
    }
  }
  const productType = profile.productType
  const eligibility = carrier.eligibility[productType]

  // If no eligibility rules defined for this product, carrier is eligible
  if (!eligibility) {
    return {
      eligible: true,
      missingFields: [],
      explanation: 'No eligibility restrictions defined',
    }
  }

  const allMissingFields: string[] = []
  const allReasons: string[] = []

  // Run all registered evaluators
  const evaluators = evaluatorFactory.getAllEvaluators()
  for (const evaluator of evaluators) {
    const result = evaluator.evaluate(eligibility, profile, productType)
    allMissingFields.push(...result.missingFields)
    allReasons.push(...result.reasons)
  }

  // Check state-specific eligibility rules if present
  if (eligibility.stateSpecific && profile.state) {
    const stateRules = eligibility.stateSpecific[profile.state]
    if (stateRules && typeof stateRules === 'object') {
      // State-specific rules could have additional requirements
      // For now, we'll just note that state-specific rules exist
      // Future: implement state-specific rule evaluation
    }
  }

  // Carrier is eligible if no reasons to exclude
  const eligible = allReasons.length === 0

  // Deduplicate missing fields
  const uniqueMissingFields = Array.from(new Set(allMissingFields))

  return {
    eligible,
    missingFields: uniqueMissingFields,
    explanation: allReasons.length > 0 ? allReasons.join('; ') : 'Eligible',
  }
}
