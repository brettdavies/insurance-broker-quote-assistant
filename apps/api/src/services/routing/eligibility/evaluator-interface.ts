import type { ProductEligibility, UserProfile } from '@repo/shared'

/**
 * Eligibility Evaluator Interface
 *
 * Strategy pattern interface for evaluating specific eligibility criteria.
 * Each evaluator handles one type of eligibility check (age, vehicles, credit score, etc.).
 */

export interface EligibilityEvaluationResult {
  eligible: boolean
  missingFields: string[]
  reasons: string[]
}

/**
 * Base interface for eligibility evaluators
 */
export interface EligibilityEvaluator {
  /**
   * Evaluate eligibility based on the evaluator's specific criteria
   *
   * @param eligibility - Product eligibility rules from knowledge pack
   * @param profile - User profile to evaluate
   * @param productType - Product type being evaluated
   * @returns Evaluation result with eligible flag, missing fields, and reasons
   */
  evaluate(
    eligibility: ProductEligibility,
    profile: UserProfile,
    productType: string
  ): EligibilityEvaluationResult
}
