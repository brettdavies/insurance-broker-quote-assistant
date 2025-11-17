import type { ProductEligibility, UserProfile } from '@repo/shared'
import type { EligibilityEvaluationResult, EligibilityEvaluator } from './evaluator-interface'

/**
 * Credit Score Eligibility Evaluator
 *
 * Evaluates credit score eligibility criteria (minCreditScore).
 */
export class CreditEvaluator implements EligibilityEvaluator {
  evaluate(
    eligibility: ProductEligibility,
    profile: UserProfile,
    productType: string
  ): EligibilityEvaluationResult {
    const missingFields: string[] = []
    const reasons: string[] = []

    // Check credit score minimum
    if (eligibility.minCreditScore) {
      const minCreditScore = eligibility.minCreditScore.value
      if (profile.creditScore === undefined || profile.creditScore === null) {
        missingFields.push('creditScore')
        reasons.push(`Credit score required (minimum ${minCreditScore})`)
      } else if (profile.creditScore < minCreditScore) {
        reasons.push(`Credit score ${profile.creditScore} below minimum ${minCreditScore}`)
      }
    }

    return {
      eligible: reasons.length === 0,
      missingFields,
      reasons,
    }
  }
}
