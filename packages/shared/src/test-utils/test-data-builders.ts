/**
 * Test Data Builders
 *
 * Builder functions for creating test data structures.
 * Uses functional approach (not classes) for simplicity.
 */

import type { Citation } from '../schemas/intake-result'
import type { RouteDecision } from '../schemas/intake-result'
import type { Opportunity } from '../schemas/opportunity'
import type { BundleOption } from '../schemas/policy-analysis-result'
import type { DeductibleOptimization } from '../schemas/policy-analysis-result'
import type { PolicySummary } from '../schemas/policy-summary'
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

/**
 * Build a PolicySummary with defaults and overrides
 *
 * @param overrides - Partial PolicySummary to override defaults
 * @returns Complete PolicySummary
 */
export function buildPolicySummary(overrides?: Partial<PolicySummary>): PolicySummary {
  return {
    carrier: 'GEICO',
    state: 'CA',
    productType: 'auto',
    premiums: { annual: 1200 },
    ...overrides,
  }
}

/**
 * Build an Opportunity with defaults and overrides
 *
 * @param overrides - Partial Opportunity to override defaults
 * @returns Complete Opportunity
 */
export function buildOpportunity(overrides?: Partial<Opportunity>): Opportunity {
  return {
    discount: 'Test Discount',
    percentage: 10,
    annualSavings: 120,
    requires: [],
    citation: {
      id: 'disc_test',
      type: 'discount',
      carrier: 'carr_test',
      file: 'knowledge_pack/carriers/geico.json',
    },
    ...overrides,
  }
}

/**
 * Build a BundleOption with defaults and overrides
 *
 * @param overrides - Partial BundleOption to override defaults
 * @returns Complete BundleOption
 */
export function buildBundleOption(overrides?: Partial<BundleOption>): BundleOption {
  return {
    product: 'home',
    estimatedSavings: 200,
    requiredActions: [],
    citation: {
      id: 'disc_bundle',
      type: 'discount',
      carrier: 'carr_test',
      file: 'knowledge_pack/carriers/geico.json',
    },
    ...overrides,
  }
}

/**
 * Build a DeductibleOptimization with defaults and overrides
 *
 * @param overrides - Partial DeductibleOptimization to override defaults
 * @returns Complete DeductibleOptimization
 */
export function buildDeductibleOptimization(
  overrides?: Partial<DeductibleOptimization>
): DeductibleOptimization {
  return {
    currentDeductible: 500,
    suggestedDeductible: 1000,
    estimatedSavings: 150,
    premiumImpact: -150,
    citation: {
      id: 'disc_deductible',
      type: 'discount',
      carrier: 'carr_test',
      file: 'knowledge_pack/carriers/geico.json',
    },
    ...overrides,
  }
}
