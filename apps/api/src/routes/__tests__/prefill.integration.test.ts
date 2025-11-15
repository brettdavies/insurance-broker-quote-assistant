/**
 * Integration Tests for Prefill Functionality
 *
 * Tests prefill packet generation integration with routing engine:
 * - Prefill includes routing decision from routing engine
 * - Prefill routing contains eligible carriers
 * - Prefill routing contains primary carrier
 * - Prefill routing contains confidence and rationale
 * - Prefill generation handles routing errors gracefully
 *
 * @see docs/stories/1.8.prefill-packet-generation.md
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import type { RouteDecision, UserProfile } from '@repo/shared'
import { createTestCarrier } from '../../__tests__/fixtures/knowledge-pack'
import { generatePrefillPacket } from '../../services/prefill-generator'
import { routeToCarrier } from '../../services/routing-engine'

// Setup: Use real knowledge_pack as base
beforeAll(async () => {
  // Test setup if needed
})

afterAll(async () => {
  // Test cleanup if needed
})

describe('Prefill Integration with Routing Engine', () => {
  it('should include routing decision in prefill packet', async () => {
    const geico = createTestCarrier('GEICO', ['CA'], ['auto']).carrier
    const progressive = createTestCarrier('Progressive', ['CA'], ['auto']).carrier

    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      age: 30,
    }

    // Get route decision from routing engine
    const routeDecision = routeToCarrier(profile, () => [geico, progressive])

    // Generate prefill packet
    const prefill = await generatePrefillPacket(profile, routeDecision, [], [])

    // Verify routing is included
    expect(prefill.routing).toBeDefined()
    expect(prefill.routing.primaryCarrier).toBe(routeDecision.primaryCarrier)
    expect(prefill.routing.eligibleCarriers).toEqual(routeDecision.eligibleCarriers)
    expect(prefill.routing.confidence).toBe(routeDecision.confidence)
  })

  it('should include all eligible carriers in prefill routing', async () => {
    const geico = createTestCarrier('GEICO', ['CA'], ['auto']).carrier
    const progressive = createTestCarrier('Progressive', ['CA'], ['auto']).carrier
    const stateFarm = createTestCarrier('State Farm', ['CA'], ['auto']).carrier

    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      age: 30,
    }

    const routeDecision = routeToCarrier(profile, () => [geico, progressive, stateFarm])
    const prefill = await generatePrefillPacket(profile, routeDecision, [], [])

    expect(prefill.routing.eligibleCarriers.length).toBeGreaterThan(0)
    expect(prefill.routing.eligibleCarriers).toContain(routeDecision.primaryCarrier)
  })

  it('should handle routing with no eligible carriers', async () => {
    const profile: UserProfile = {
      state: 'WY', // State not in any carrier
      productType: 'auto',
      age: 30,
    }

    const geico = createTestCarrier('GEICO', ['CA'], ['auto']).carrier
    const routeDecision = routeToCarrier(profile, () => [geico])

    // Should still generate prefill even with no eligible carriers
    const prefill = await generatePrefillPacket(profile, routeDecision, [], [])

    expect(prefill.routing).toBeDefined()
    expect(prefill.routing.primaryCarrier).toBe('')
    expect(prefill.routing.eligibleCarriers).toEqual([])
    expect(prefill.routing.confidence).toBe(0)
  })

  it('should include routing rationale in prefill', async () => {
    const geico = createTestCarrier('GEICO', ['CA'], ['auto']).carrier

    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      age: 30,
    }

    const routeDecision = routeToCarrier(profile, () => [geico])
    const prefill = await generatePrefillPacket(profile, routeDecision, [], [])

    expect(prefill.routing.rationale).toBeDefined()
    expect(typeof prefill.routing.rationale).toBe('string')
    expect(prefill.routing.rationale.length).toBeGreaterThan(0)
  })

  it('should preserve routing confidence in prefill', async () => {
    const geico = createTestCarrier('GEICO', ['CA'], ['auto']).carrier

    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      age: 30,
      vehicles: 2,
    }

    const routeDecision = routeToCarrier(profile, () => [geico])
    const prefill = await generatePrefillPacket(profile, routeDecision, [], [])

    expect(prefill.routing.confidence).toBe(routeDecision.confidence)
    expect(prefill.routing.confidence).toBeGreaterThanOrEqual(0)
    expect(prefill.routing.confidence).toBeLessThanOrEqual(1)
  })

  it('should handle routing with tied carriers', async () => {
    const geico = createTestCarrier('GEICO', ['CA'], ['auto']).carrier
    const progressive = createTestCarrier('Progressive', ['CA'], ['auto']).carrier

    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      age: 30,
    }

    const routeDecision = routeToCarrier(profile, () => [geico, progressive])
    const prefill = await generatePrefillPacket(profile, routeDecision, [], [])

    // Should include all eligible carriers even if tied
    expect(prefill.routing.eligibleCarriers.length).toBeGreaterThanOrEqual(1)
    expect(prefill.routing.primaryCarrier).toBeDefined()
  })

  it('should generate prefill with routing for different product types', async () => {
    const geico = createTestCarrier('GEICO', ['CA'], ['auto', 'home', 'renters']).carrier

    const testCases = [
      { productType: 'auto' as const, state: 'CA' },
      { productType: 'home' as const, state: 'CA' },
      { productType: 'renters' as const, state: 'CA' },
    ]

    for (const testCase of testCases) {
      const profile: UserProfile = {
        state: testCase.state,
        productType: testCase.productType,
        age: 30,
      }

      const routeDecision = routeToCarrier(profile, () => [geico])
      const prefill = await generatePrefillPacket(profile, routeDecision, [], [])

      expect(prefill.routing).toBeDefined()
      expect(prefill.profile.productType).toBe(testCase.productType)
    }
  })

  it('should include routing in producer notes', async () => {
    const geico = createTestCarrier('GEICO', ['CA'], ['auto']).carrier
    const progressive = createTestCarrier('Progressive', ['CA'], ['auto']).carrier

    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      age: 30,
    }

    const routeDecision = routeToCarrier(profile, () => [geico, progressive])
    const prefill = await generatePrefillPacket(profile, routeDecision, [], [])

    // Producer notes should mention routing
    expect(prefill.producerNotes).toBeDefined()
    expect(Array.isArray(prefill.producerNotes)).toBe(true)
    const notesText = prefill.producerNotes?.join(' ') || ''
    expect(notesText.toLowerCase()).toContain(routeDecision.primaryCarrier.toLowerCase())
  })
})
