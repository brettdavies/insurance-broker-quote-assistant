import type { ProductEligibility, UserProfile } from '@repo/shared'
import type { EligibilityEvaluationResult, EligibilityEvaluator } from './evaluator-interface'

/**
 * Age Eligibility Evaluator
 *
 * Evaluates age-based eligibility criteria (minAge, maxAge).
 */
export class AgeEvaluator implements EligibilityEvaluator {
  evaluate(
    eligibility: ProductEligibility,
    profile: UserProfile,
    productType: string
  ): EligibilityEvaluationResult {
    const missingFields: string[] = []
    const reasons: string[] = []

    // Check minimum age
    if (eligibility.minAge) {
      const minAge = eligibility.minAge.value
      if (profile.age === undefined || profile.age === null) {
        missingFields.push('age')
        reasons.push(`Age required (minimum ${minAge})`)
      } else if (profile.age < minAge) {
        reasons.push(`Age ${profile.age} below minimum ${minAge}`)
      }
    }

    // Check maximum age
    if (eligibility.maxAge) {
      const maxAge = eligibility.maxAge.value
      if (profile.age === undefined || profile.age === null) {
        if (!missingFields.includes('age')) {
          missingFields.push('age')
        }
        reasons.push(`Age required (maximum ${maxAge})`)
      } else if (profile.age > maxAge) {
        reasons.push(`Age ${profile.age} above maximum ${maxAge}`)
      }
    }

    return {
      eligible: reasons.length === 0,
      missingFields,
      reasons,
    }
  }
}
