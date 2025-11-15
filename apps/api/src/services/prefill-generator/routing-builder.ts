/**
 * Routing Builder
 *
 * Creates simplified routing information for prefill packets.
 */

import type { PrefillRouting, RouteDecision } from '@repo/shared'

/**
 * Create simplified routing decision for prefill packet
 * Includes primary carrier, eligible carriers, confidence, and rationale
 *
 * @param route - Full routing decision from routing engine
 * @returns Simplified routing for customer-facing prefill packet
 */
export function createPrefillRouting(route: RouteDecision): PrefillRouting {
  // Create brief rationale without exposing internal scores
  const briefRationale = `${route.primaryCarrier} recommended based on your profile and coverage needs.`

  return {
    primaryCarrier: route.primaryCarrier,
    eligibleCarriers: route.eligibleCarriers,
    confidence: route.confidence,
    rationale: briefRationale,
  }
}
