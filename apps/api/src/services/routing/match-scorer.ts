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
 * @returns Match score (0-1, higher is better)
 */
export function calculateMatchScore(
  carrier: Carrier,
  eligibilityResult: EligibilityResult,
  profile: UserProfile
): number {
  // Base score: 1.0 if eligible, 0.0 if not
  if (!eligibilityResult.eligible) {
    return 0.0
  }

  let score = 1.0

  // Deduct points for missing optional fields (lower data completeness)
  const missingFieldPenalty = eligibilityResult.missingFields.length * MISSING_FIELD_PENALTY
  score -= missingFieldPenalty

  // Bonus points for carriers with compensation data (broker preference)
  if (carrier.compensation) {
    score += 0.05
  }

  // Ensure score stays in valid range
  return Math.max(0.0, Math.min(1.0, score))
}
