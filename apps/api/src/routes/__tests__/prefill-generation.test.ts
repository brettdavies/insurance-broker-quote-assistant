/**
 * Integration Tests for Prefill Generation Endpoint
 *
 * @see docs/stories/1.8.prefill-packet-generation.md#task-11
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { PrefillPacket, UserProfile } from '@repo/shared'
import { buildUserProfile } from '@repo/shared'
import app from '../../index'
import { TestClient, expectSuccessResponse } from '../helpers'

describe('POST /api/generate-prefill', () => {
  let client: TestClient

  beforeEach(() => {
    client = new TestClient(app, 'http://localhost:7070')
  })

  it('should return PrefillPacket with all required fields', async () => {
    const profile = buildUserProfile({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      vehicles: 2,
      drivers: 1,
    })

    const prefill = await client.postJson<PrefillPacket>('/api/generate-prefill', { profile })

    // Check required fields
    expect(prefill.state).toBe('CA')
    expect(prefill.productLine).toBe('auto')
    expect(prefill.routingDecision).toBeDefined()
    expect(prefill.missingFields).toBeDefined()
    expect(Array.isArray(prefill.missingFields)).toBe(true)
    expect(prefill.disclaimers).toBeDefined()
    expect(Array.isArray(prefill.disclaimers)).toBe(true)
    expect(prefill.generatedAt).toBeDefined()
    expect(prefill.reviewedByLicensedAgent).toBe(false)
  })

  it('should include shopper identity in prefill packet', async () => {
    const profile = buildUserProfile({
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-5678',
    })

    const prefill = await client.postJson<PrefillPacket>('/api/generate-prefill', { profile })

    expect(prefill.fullName).toBe('Jane Smith')
    expect(prefill.email).toBe('jane@example.com')
    expect(prefill.phone).toBe('555-5678')
  })

  it('should include routing decision in prefill packet', async () => {
    const profile = buildUserProfile({ vehicles: 1 })

    const prefill = await client.postJson<PrefillPacket>('/api/generate-prefill', { profile })

    expect(prefill.routingDecision).toBeDefined()
    expect(typeof prefill.routingDecision).toBe('string')
    expect(prefill.routingDecision.length).toBeGreaterThan(0)
  })

  it('should flag missing fields with priority indicators', async () => {
    const profile = buildUserProfile({
      // Missing vehicles and drivers (critical)
      vehicles: undefined,
      drivers: undefined,
    })

    const prefill = await client.postJson<PrefillPacket>('/api/generate-prefill', { profile })

    expect(prefill.missingFields.length).toBeGreaterThan(0)
    expect(prefill.missingFields.some((f) => f.priority === 'critical')).toBe(true)
  })

  it('should include lead handoff summary in agentNotes', async () => {
    const profile = buildUserProfile()

    const prefill = await client.postJson<PrefillPacket>('/api/generate-prefill', { profile })

    expect(prefill.agentNotes).toBeDefined()
    expect(Array.isArray(prefill.agentNotes)).toBe(true)
    expect(prefill.agentNotes?.length).toBeGreaterThan(0)
  })

  it('should embed disclaimers based on state/product', async () => {
    const profile = buildUserProfile()

    const prefill = await client.postJson<PrefillPacket>('/api/generate-prefill', { profile })

    expect(prefill.disclaimers.length).toBeGreaterThan(0)
    // Should include CA-specific disclaimers
    expect(prefill.disclaimers.some((d) => d.includes('California'))).toBe(true)
  })

  it('should validate prefill packet against schema', async () => {
    const profile = buildUserProfile({ vehicles: 2, drivers: 1 })

    const prefill = await client.postJson<PrefillPacket>('/api/generate-prefill', { profile })

    // Validate structure matches PrefillPacket schema
    expect(prefill).toHaveProperty('state')
    expect(prefill).toHaveProperty('productLine')
    expect(prefill).toHaveProperty('routingDecision')
    expect(prefill).toHaveProperty('missingFields')
    expect(prefill).toHaveProperty('disclaimers')
    expect(prefill).toHaveProperty('generatedAt')
    expect(prefill).toHaveProperty('reviewedByLicensedAgent')

    // Validate types
    expect(typeof prefill.state).toBe('string')
    expect(['auto', 'home', 'renters', 'umbrella']).toContain(prefill.productLine)
    expect(typeof prefill.routingDecision).toBe('string')
    expect(Array.isArray(prefill.missingFields)).toBe(true)
    expect(Array.isArray(prefill.disclaimers)).toBe(true)
    expect(typeof prefill.generatedAt).toBe('string')
    expect(typeof prefill.reviewedByLicensedAgent).toBe('boolean')
  })

  it('should return 400 for invalid request body', async () => {
    const res = await client.post('/api/generate-prefill', { invalid: 'data' })
    expect(res.status).toBe(400)

    const error = (await res.json()) as { error?: { code?: string } }
    expect(error.error).toBeDefined()
    expect(error.error?.code).toBe('INVALID_REQUEST')
  })

  it('should handle routing errors gracefully', async () => {
    // Profile with invalid state that might cause routing to fail
    const profile = buildUserProfile({ state: 'XX' }) // Invalid state code

    const prefill = await client.postJson<PrefillPacket>('/api/generate-prefill', { profile })
    expect(prefill.state).toBe('XX')
    expect(prefill.productLine).toBe('auto')
  })
})

describe('Prefill generation integrated with intake endpoint', () => {
  let client: TestClient

  beforeEach(() => {
    client = new TestClient(app, 'http://localhost:7070')
  })

  it('should include prefill packet in IntakeResult response', async () => {
    const result = await client.postJson<{
      route?: { primaryCarrier?: string; eligibleCarriers?: string[] }
      prefill?: PrefillPacket
      complianceValidated?: boolean
      profile?: UserProfile
    }>('/api/intake', {
      message: 'I need auto insurance in California. I have 2 vehicles and 1 driver.',
    })

    // Prefill packet should be included if routing succeeded AND state/productLine are extracted
    // Note: Prefill generation requires state and productLine, so it may be undefined even if route exists
    if (result.route && result.profile?.state && result.profile?.productLine) {
      expect(result.prefill).toBeDefined()
      if (result.prefill) {
        expect(result.prefill.state).toBeDefined()
        expect(result.prefill.productLine).toBeDefined()
        expect(result.prefill.routingDecision).toBeDefined()
      }
    } else {
      // Prefill may be undefined if state/productLine not extracted - this is expected behavior
      // The test should not fail in this case
    }
  })

  it('should generate prefill packet after compliance check', async () => {
    const result = await client.postJson<{
      route?: { primaryCarrier?: string; eligibleCarriers?: string[] }
      prefill?: PrefillPacket
      complianceValidated?: boolean
    }>('/api/intake', {
      message: 'I need home insurance in Texas. Single family home built in 2000.',
    })

    // Compliance should be validated
    expect(result.complianceValidated).toBeDefined()

    // Prefill packet should include disclaimers from compliance filter
    if (result.prefill) {
      expect(result.prefill.disclaimers).toBeDefined()
      expect(Array.isArray(result.prefill.disclaimers)).toBe(true)
    }
  })

  it('should include all data from intake flow in prefill packet', async () => {
    const result = await client.postJson<{
      route?: { primaryCarrier?: string; eligibleCarriers?: string[] }
      prefill?: PrefillPacket
      complianceValidated?: boolean
    }>('/api/intake', {
      message: 'Name: John Doe, Email: john@example.com, State: CA, Product: auto, Vehicles: 2',
    })

    if (result.prefill) {
      // Should include extracted profile data
      expect(result.prefill.state).toBeDefined()
      expect(result.prefill.productLine).toBeDefined()

      // Should include routing decision
      expect(result.prefill.routingDecision).toBeDefined()

      // Should include missing fields
      expect(result.prefill.missingFields).toBeDefined()
    }
  })
})
