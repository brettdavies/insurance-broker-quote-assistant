import type { ProductEligibility, UserProfile } from '@repo/shared'
import type { EligibilityEvaluationResult, EligibilityEvaluator } from './evaluator-interface'

/**
 * Vehicle Eligibility Evaluator
 *
 * Evaluates vehicle count eligibility criteria (maxVehicles) for auto products.
 */
export class VehicleEvaluator implements EligibilityEvaluator {
  evaluate(
    eligibility: ProductEligibility,
    profile: UserProfile,
    productType: string
  ): EligibilityEvaluationResult {
    const missingFields: string[] = []
    const reasons: string[] = []

    // Check vehicle limits (auto only)
    if (productType === 'auto' && eligibility.maxVehicles) {
      const maxVehicles = eligibility.maxVehicles.value
      if (profile.vehicles === undefined || profile.vehicles === null) {
        missingFields.push('vehicles')
        reasons.push(`Vehicle count required (maximum ${maxVehicles})`)
      } else if (profile.vehicles > maxVehicles) {
        reasons.push(`Vehicle count ${profile.vehicles} exceeds maximum ${maxVehicles}`)
      }
    }

    return {
      eligible: reasons.length === 0,
      missingFields,
      reasons,
    }
  }
}
