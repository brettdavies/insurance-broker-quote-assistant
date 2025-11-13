import type { ProductEligibility, UserProfile } from '@repo/shared'
import type { EligibilityEvaluationResult, EligibilityEvaluator } from './evaluator-interface'

/**
 * Driving Record Eligibility Evaluator
 *
 * Evaluates clean driving record requirements for auto products.
 */
export class DrivingRecordEvaluator implements EligibilityEvaluator {
  evaluate(
    eligibility: ProductEligibility,
    profile: UserProfile,
    productType: string
  ): EligibilityEvaluationResult {
    const missingFields: string[] = []
    const reasons: string[] = []

    // Check driving record requirement (auto only)
    if (productType === 'auto' && eligibility.requiresCleanDrivingRecord) {
      const requiresClean = eligibility.requiresCleanDrivingRecord.value
      if (requiresClean) {
        if (profile.cleanRecord3Yr === undefined) {
          missingFields.push('cleanRecord3Yr')
          reasons.push('Clean driving record (3 years) required')
        } else if (!profile.cleanRecord3Yr) {
          reasons.push('Clean driving record (3 years) required but not met')
        }
      }
    }

    return {
      eligible: reasons.length === 0,
      missingFields,
      reasons,
    }
  }
}
