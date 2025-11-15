/**
 * Prefill Test Factories
 *
 * Factory functions for creating test data structures used in prefill generator tests.
 * Provides sensible defaults while allowing field overrides.
 */

import type { MissingField, RouteDecision, UserProfile } from '@repo/shared'

/**
 * Create a test UserProfile with sensible defaults
 *
 * @param overrides - Partial UserProfile to override defaults
 * @returns UserProfile with defaults applied
 */
export function createTestUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    state: 'CA',
    productType: 'auto',
    age: 30,
    ...overrides,
  }
}

/**
 * Create a test UserProfile for auto product
 *
 * @param overrides - Partial UserProfile to override defaults
 * @returns UserProfile configured for auto insurance
 */
export function createAutoProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return createTestUserProfile({
    productType: 'auto',
    ...overrides,
  })
}

/**
 * Create a test UserProfile for home product
 *
 * @param overrides - Partial UserProfile to override defaults
 * @returns UserProfile configured for home insurance
 */
export function createHomeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return createTestUserProfile({
    productType: 'home',
    ...overrides,
  })
}

/**
 * Create a test UserProfile for renters product
 *
 * @param overrides - Partial UserProfile to override defaults
 * @returns UserProfile configured for renters insurance
 */
export function createRentersProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return createTestUserProfile({
    productType: 'renters',
    ...overrides,
  })
}

/**
 * Create a test UserProfile for umbrella product
 *
 * @param overrides - Partial UserProfile to override defaults
 * @returns UserProfile configured for umbrella insurance
 */
export function createUmbrellaProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return createTestUserProfile({
    productType: 'umbrella',
    ...overrides,
  })
}

/**
 * Create a complete auto profile with all common fields
 *
 * @param overrides - Partial UserProfile to override defaults
 * @returns Complete UserProfile for auto insurance
 */
export function createCompleteAutoProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return createAutoProfile({
    vehicles: 2,
    drivers: 1,
    vins: 'ABC123 DEF456',
    garage: 'attached',
    ...overrides,
  })
}

/**
 * Create a complete home profile with all common fields
 *
 * @param overrides - Partial UserProfile to override defaults
 * @returns Complete UserProfile for home insurance
 */
export function createCompleteHomeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return createHomeProfile({
    propertyType: 'single-family',
    yearBuilt: 2000,
    squareFeet: 2000,
    roofType: 'asphalt',
    ...overrides,
  })
}

/**
 * Create a test RouteDecision with sensible defaults
 *
 * @param overrides - Partial RouteDecision to override defaults
 * @returns RouteDecision with defaults applied
 */
export function createTestRouteDecision(overrides: Partial<RouteDecision> = {}): RouteDecision {
  return {
    primaryCarrier: 'GEICO',
    eligibleCarriers: ['GEICO', 'Progressive'],
    confidence: 0.9,
    rationale: 'GEICO offers best rates',
    citations: [],
    ...overrides,
  }
}

/**
 * Create a test RouteDecision with extended eligible carriers
 *
 * @param overrides - Partial RouteDecision to override defaults
 * @returns RouteDecision with extended carrier list
 */
export function createExtendedRouteDecision(overrides: Partial<RouteDecision> = {}): RouteDecision {
  return createTestRouteDecision({
    eligibleCarriers: ['GEICO', 'Progressive', 'State Farm'],
    rationale: 'GEICO offers best rates for CA auto insurance',
    ...overrides,
  })
}

/**
 * Create a test disclaimers array
 *
 * @param disclaimers - Array of disclaimer strings (defaults to standard test disclaimers)
 * @returns Array of disclaimer strings
 */
export function createTestDisclaimers(
  disclaimers: string[] = ['Disclaimer 1', 'Disclaimer 2']
): string[] {
  return disclaimers
}

/**
 * Create a test MissingField array
 *
 * @param fields - Array of field names with optional priorities
 * @returns Array of MissingField objects
 */
export function createTestMissingFields(
  fields: Array<{ field: string; priority?: 'critical' | 'important' | 'optional' }>
): MissingField[] {
  return fields.map(({ field, priority = 'critical' }) => ({
    field,
    priority,
  }))
}
