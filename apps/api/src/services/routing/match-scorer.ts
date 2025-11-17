/**
 * Match Scorer
 *
 * Calculates match scores for carriers based on eligibility and profile data.
 */

import type { Carrier, UserProfile } from '@repo/shared'
import { MISSING_FIELD_PENALTY } from '@repo/shared'

/**
 * Eligibility evaluation result
 */
export interface EligibilityResult {
  eligible: boolean
  missingFields: string[]
  explanation: string
}

/**
 * Calculate match score for a carrier
 *
 * @param carrier - Carrier to score
 * @param eligibilityResult - Eligibility evaluation result
 * @param profile - User profile
 * @returns Match score (0-100 integer, higher is better)
 */
export function calculateMatchScore(
  carrier: Carrier,
  eligibilityResult: EligibilityResult,
  profile: UserProfile
): number {
  // Base score: 100 if eligible, 0 if not
  if (!eligibilityResult.eligible) {
    return 0
  }

  let score = 100

  // Deduct points for missing optional fields (lower data completeness)
  // MISSING_FIELD_PENALTY is 0-1, so multiply by 100 to get 0-100 penalty
  const missingFieldPenalty = eligibilityResult.missingFields.length * MISSING_FIELD_PENALTY * 100
  score -= missingFieldPenalty

  // Bonus points for carriers with compensation data (broker preference)
  if (carrier.compensation) {
    score += 5 // 0.05 * 100 = 5
  }

  // Ensure score stays in valid range and return as integer
  return Math.round(Math.max(0, Math.min(100, score)))
}
