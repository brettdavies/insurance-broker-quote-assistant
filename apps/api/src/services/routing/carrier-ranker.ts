/**
 * Carrier Ranker
 *
 * Ranks carriers by match score.
 */

/**
 * Carrier match with score and eligibility
 */
export interface CarrierMatch {
  carrier: import('@repo/shared').Carrier
  eligible: boolean
  matchScore: number
  missingFields: string[]
  explanation: string
}

/**
 * Rank carriers by match score (descending)
 *
 * @param matches - Carrier matches to rank
 * @returns Sorted array of carrier matches (highest score first)
 */
export function rankCarriers(matches: CarrierMatch[]): CarrierMatch[] {
  return [...matches].sort((a, b) => b.matchScore - a.matchScore)
}
