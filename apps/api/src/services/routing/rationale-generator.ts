/**
 * Rationale Generator
 *
 * Generates human-readable rationales for routing decisions.
 */

import type { UserProfile } from '@repo/shared'
import type { CarrierMatch } from './carrier-ranker'

/**
 * Generate human-readable rationale for routing decision
 *
 * @param rankedCarriers - Carriers ranked by match score
 * @param profile - User profile
 * @param allMatches - All carrier matches (including ineligible)
 * @param selectedPrimary - The actual selected primary carrier (after tiebreaker logic)
 * @returns Rationale string
 */
export function generateRationale(
  rankedCarriers: CarrierMatch[],
  profile: UserProfile,
  allMatches: CarrierMatch[],
  selectedPrimary: CarrierMatch
): string {
  if (rankedCarriers.length === 0) {
    return 'No eligible carriers found'
  }

  const primary = selectedPrimary
  if (!primary) {
    return 'No eligible carriers found'
  }
  const parts: string[] = []

  // Explain primary carrier selection
  // Match scores are now 0-100 integers
  parts.push(
    `Selected ${primary.carrier.name} as primary carrier (match score: ${primary.matchScore}%)`
  )

  // List alternatives if any (exclude the selected primary carrier)
  const alternativeCarriers = rankedCarriers.filter((m) => m.carrier.name !== primary.carrier.name)
  if (alternativeCarriers.length > 0) {
    const alternatives = alternativeCarriers
      .map((m) => `${m.carrier.name} (${m.matchScore}%)`)
      .join(', ')
    parts.push(`Alternatives: ${alternatives}`)
  }

  // Note missing data affecting confidence
  const allMissingFields = new Set<string>()
  for (const m of rankedCarriers) {
    for (const field of m.missingFields) {
      allMissingFields.add(field)
    }
  }

  if (allMissingFields.size > 0) {
    const missingList = Array.from(allMissingFields).join(', ')
    parts.push(`Note: Missing fields (${missingList}) may affect accuracy`)
  }

  return parts.join('. ')
}
