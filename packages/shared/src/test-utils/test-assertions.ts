/**
 * Test Assertions
 *
 * Target-aware assertion helpers that handle differences between
 * mock (exact) and real API (flexible) test expectations.
 */

import { expect } from 'bun:test'
import type { UserProfile } from '../schemas/user-profile'
import type { ExtractionResult } from './llm-test-factories'
import type { TestTarget } from './test-targets'

/**
 * Assert extraction result matches expected values
 *
 * Handles differences between mock (exact) and real API (flexible) expectations:
 * - Mock: Exact field matches
 * - Real API: Field presence and type validation (values may vary)
 *
 * @param result - Actual extraction result
 * @param expected - Expected partial profile
 * @param target - Test target ('mock' | 'real-api' | 'contract')
 */
export function assertExtractionResult(
  result: ExtractionResult,
  expected: Partial<UserProfile>,
  target: TestTarget = 'mock'
): void {
  expect(result).toBeDefined()
  expect(result.profile).toBeDefined()
  expect(result.confidence).toBeDefined()
  expect(typeof result.confidence).toBe('object')

  if (target === 'mock') {
    // Mock: Exact matches
    for (const [key, expectedValue] of Object.entries(expected)) {
      expect(result.profile[key as keyof UserProfile]).toBe(expectedValue)
    }
  } else {
    // Real API: Flexible validation (presence and type)
    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = result.profile[key as keyof UserProfile]
      expect(actualValue).toBeDefined()

      // Type validation
      if (expectedValue !== undefined) {
        expect(typeof actualValue).toBe(typeof expectedValue)
      }

      // For string fields, allow variations (e.g., 'CA' vs 'California')
      if (typeof expectedValue === 'string' && key === 'state') {
        // State can be 'CA' or 'California' - just check it's a string
        expect(typeof actualValue).toBe('string')
      } else if (typeof expectedValue === 'string' && key === 'productType') {
        // Product line must match exactly (enum)
        expect(actualValue).toBe(expectedValue)
      }
    }
  }

  // Confidence scores should exist for extracted fields
  for (const key of Object.keys(expected)) {
    if (result.profile[key as keyof UserProfile] !== undefined) {
      expect(result.confidence[key]).toBeDefined()
      expect(typeof result.confidence[key]).toBe('number')
      expect(result.confidence[key]).toBeGreaterThanOrEqual(0)
      expect(result.confidence[key]).toBeLessThanOrEqual(1)
    }
  }
}

/**
 * Assert route decision structure
 *
 * @param route - Route decision to validate
 */
export function assertRouteDecision(route: {
  primaryCarrier?: string
  eligibleCarriers?: string[]
  confidence?: number
  rationale?: string
  citations?: unknown[]
}): void {
  expect(route).toBeDefined()

  if (route.primaryCarrier !== undefined) {
    expect(typeof route.primaryCarrier).toBe('string')
  }

  if (route.eligibleCarriers !== undefined) {
    expect(Array.isArray(route.eligibleCarriers)).toBe(true)
    if (route.primaryCarrier) {
      expect(route.eligibleCarriers).toContain(route.primaryCarrier)
    }
  }

  if (route.confidence !== undefined) {
    expect(typeof route.confidence).toBe('number')
    expect(route.confidence).toBeGreaterThanOrEqual(0)
    expect(route.confidence).toBeLessThanOrEqual(1)
  }

  if (route.rationale !== undefined) {
    expect(typeof route.rationale).toBe('string')
    expect(route.rationale.length).toBeGreaterThan(0)
  }

  if (route.citations !== undefined) {
    expect(Array.isArray(route.citations)).toBe(true)
  }
}

/**
 * Assert user profile structure
 *
 * @param profile - User profile to validate
 */
export function assertUserProfile(profile: Partial<UserProfile>): void {
  expect(profile).toBeDefined()
  expect(typeof profile).toBe('object')

  // Validate field types if present (now using nullish checks)
  if (profile.state !== undefined && profile.state !== null) {
    expect(typeof profile.state).toBe('string')
  }

  if (profile.productType !== undefined && profile.productType !== null) {
    const validProductLines = ['auto', 'home', 'renters', 'umbrella'] as const
    expect(validProductLines.includes(profile.productType)).toBe(true)
  }

  if (profile.age !== undefined && profile.age !== null) {
    expect(typeof profile.age).toBe('number')
    expect(profile.age).toBeGreaterThan(0)
  }

  if (profile.vehicles !== undefined && profile.vehicles !== null) {
    expect(typeof profile.vehicles).toBe('number')
    expect(profile.vehicles).toBeGreaterThanOrEqual(0)
  }

  if (profile.householdSize !== undefined && profile.householdSize !== null) {
    expect(typeof profile.householdSize).toBe('number')
    expect(profile.householdSize).toBeGreaterThan(0)
  }

  if (profile.ownsHome !== undefined && profile.ownsHome !== null) {
    expect(typeof profile.ownsHome).toBe('boolean')
  }
}
