/**
 * Routing Loader Service
 *
 * Provides routing decisions based on user profile.
 * Single Responsibility: Routing decision retrieval only
 *
 * Similar to disclaimers-loader.ts - provides a clean service layer
 * for routing functionality.
 */

import type { RouteDecision, UserProfile } from '@repo/shared'
import { routeToCarrier } from './routing-engine'

/**
 * Get route decision based on profile
 *
 * @param profile - User profile with state, productType, and optional eligibility fields
 * @returns RouteDecision with primary carrier, eligible carriers, scores, and rationale
 */
export function getRouteDecision(profile: UserProfile): RouteDecision {
  return routeToCarrier(profile)
}
