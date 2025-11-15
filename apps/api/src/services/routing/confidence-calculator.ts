/**
 * Confidence Calculator
 *
 * Calculates overall confidence scores for routing decisions.
 */

import type { UserProfile } from '@repo/shared'
import type { CarrierMatch } from './carrier-ranker'

/**
 * Calculate overall confidence score
 *
 * @param rankedCarriers - Carriers ranked by match score
 * @param profile - User profile
 * @returns Confidence score (0-1)
 */
export function calculateConfidence(rankedCarriers: CarrierMatch[], profile: UserProfile): number {
  if (rankedCarriers.length === 0) {
    return 0.0
  }

  // Calculate data completeness score
  const requiredFields = ['state', 'productType']
  const optionalFields = ['age', 'vehicles']
  const providedFields =
    requiredFields.length +
    optionalFields.filter((field) => profile[field as keyof UserProfile] !== undefined).length
  const totalFields = requiredFields.length + optionalFields.length
  const completenessScore = providedFields / totalFields

  // Average of top 3 carriers' match scores, weighted by data completeness
  const top3Scores = rankedCarriers.slice(0, 3).map((m) => m.matchScore)
  const avgMatchScore = top3Scores.reduce((sum, score) => sum + score, 0) / top3Scores.length

  // Weighted combination: 70% match score, 30% data completeness
  return avgMatchScore * 0.7 + completenessScore * 0.3
}
