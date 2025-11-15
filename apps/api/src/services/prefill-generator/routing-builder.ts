/**
 * Routing Builder
 *
 * Creates simplified routing information for prefill packets.
 */

import type { PrefillRouting, RouteDecision } from '@repo/shared'

/**
 * Create simplified routing decision for prefill packet
 * Only includes carrier and rationale, not internal match scores or alternatives
 *
 * @param route - Full routing decision from routing engine
 * @returns Simplified routing for customer-facing prefill packet
 */
export function createPrefillRouting(route: RouteDecision): PrefillRouting {
  // Create brief rationale without exposing internal scores
  const briefRationale = `${route.primaryCarrier} recommended based on your profile and coverage needs.`

  return {
    primaryCarrier: route.primaryCarrier,
    confidence: route.confidence,
    rationale: briefRationale,
  }
}
