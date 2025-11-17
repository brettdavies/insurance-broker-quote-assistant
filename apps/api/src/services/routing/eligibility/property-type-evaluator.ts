import type { ProductEligibility, UserProfile } from '@repo/shared'
import type { EligibilityEvaluationResult, EligibilityEvaluator } from './evaluator-interface'

/**
 * Property Type Eligibility Evaluator
 *
 * Evaluates property type restrictions for home/renters products.
 */
export class PropertyTypeEvaluator implements EligibilityEvaluator {
  evaluate(
    eligibility: ProductEligibility,
    profile: UserProfile,
    productType: string
  ): EligibilityEvaluationResult {
    const missingFields: string[] = []
    const reasons: string[] = []

    // Check property type restrictions (home/renters only)
    if (
      (productType === 'home' || productType === 'renters') &&
      eligibility.propertyTypeRestrictions
    ) {
      const allowedTypes = eligibility.propertyTypeRestrictions.value
      if (profile.propertyType === undefined || profile.propertyType === null) {
        missingFields.push('propertyType')
        reasons.push(`Property type required (allowed: ${allowedTypes.join(', ')})`)
      } else if (!allowedTypes.includes(profile.propertyType)) {
        reasons.push(
          `Property type '${profile.propertyType}' not allowed (allowed: ${allowedTypes.join(', ')})`
        )
      }
    }

    return {
      eligible: reasons.length === 0,
      missingFields,
      reasons,
    }
  }
}
