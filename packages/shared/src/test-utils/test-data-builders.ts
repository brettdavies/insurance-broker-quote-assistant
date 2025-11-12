/**
 * Test Data Builders
 *
 * Builder functions for creating test data structures.
 * Uses functional approach (not classes) for simplicity.
 */

import type { Citation } from '../schemas/intake-result'
import type { RouteDecision } from '../schemas/intake-result'
import type { UserProfile } from '../schemas/user-profile'

/**
 * Build a UserProfile with defaults and overrides
 *
 * @param overrides - Partial UserProfile to override defaults
 * @returns Complete UserProfile
 */
export function buildUserProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    state: 'CA',
    productType: 'auto',
    age: 30,
    vehicles: 1,
    householdSize: 2,
    ownsHome: false,
    cleanRecord3Yr: true,
    ...overrides,
  }
}

/**
 * Build a RouteDecision with defaults and overrides
 *
 * @param overrides - Partial RouteDecision to override defaults
 * @returns Complete RouteDecision
 */
export function buildRouteDecision(overrides?: Partial<RouteDecision>): RouteDecision {
  const defaultCitations: Citation[] = [
    {
      id: 'cite_test1',
      type: 'carrier',
      carrier: 'carr_geico',
      file: 'knowledge_pack/carriers/geico.json',
    },
  ]

  return {
    primaryCarrier: 'GEICO',
    eligibleCarriers: ['GEICO', 'Progressive'],
    confidence: 0.85,
    rationale: 'GEICO is the best match based on state, product, and eligibility criteria.',
    citations: defaultCitations,
    ...overrides,
  }
}

/**
 * Build a Citation with defaults and overrides
 *
 * @param overrides - Partial Citation to override defaults
 * @returns Complete Citation
 */
export function buildCitation(overrides?: Partial<Citation>): Citation {
  return {
    id: 'cite_test1',
    type: 'carrier',
    carrier: 'carr_geico',
    file: 'knowledge_pack/carriers/geico.json',
    ...overrides,
  }
}
