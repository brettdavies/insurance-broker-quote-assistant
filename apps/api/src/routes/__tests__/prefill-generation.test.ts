/**
 * Integration Tests for Prefill Generation Endpoint
 *
 * @see docs/stories/1.8.prefill-packet-generation.md#task-11
 */

import { describe, expect, it } from 'bun:test'
import type { PrefillPacket, RouteDecision, UserProfile } from '@repo/shared'
import { ConversationalExtractor } from '../../services/conversational-extractor'
import { GeminiProvider } from '../../services/gemini-provider'
import { createIntakeRoute } from '../intake'

describe('POST /api/intake/generate-prefill', () => {
  // Create test extractor and route
  const llmProvider = new GeminiProvider()
  const extractor = new ConversationalExtractor(llmProvider)
  const app = createIntakeRoute(extractor)

  it('should return PrefillPacket with all required fields', async () => {
    const profile: UserProfile = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      state: 'CA',
      productLine: 'auto',
      vehicles: 2,
      drivers: 1,
    }

    const req = new Request('http://localhost:7070/api/intake/generate-prefill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    })

    const res = await app.fetch(req)
    expect(res.status).toBe(200)

    const prefill = (await res.json()) as PrefillPacket

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
    const profile: UserProfile = {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-5678',
      state: 'CA',
      productLine: 'auto',
    }

    const req = new Request('http://localhost:7070/api/intake/generate-prefill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    })

    const res = await app.fetch(req)
    const prefill = (await res.json()) as PrefillPacket

    expect(prefill.fullName).toBe('Jane Smith')
    expect(prefill.email).toBe('jane@example.com')
    expect(prefill.phone).toBe('555-5678')
  })

  it('should include routing decision in prefill packet', async () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
      vehicles: 1,
    }

    const req = new Request('http://localhost:7070/api/intake/generate-prefill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    })

    const res = await app.fetch(req)
    const prefill = (await res.json()) as PrefillPacket

    expect(prefill.routingDecision).toBeDefined()
    expect(typeof prefill.routingDecision).toBe('string')
    expect(prefill.routingDecision.length).toBeGreaterThan(0)
  })

  it('should flag missing fields with priority indicators', async () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
      // Missing vehicles and drivers (critical)
    }

    const req = new Request('http://localhost:7070/api/intake/generate-prefill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    })

    const res = await app.fetch(req)
    const prefill = (await res.json()) as PrefillPacket

    expect(prefill.missingFields.length).toBeGreaterThan(0)
    expect(prefill.missingFields.some((f) => f.startsWith('[CRITICAL]'))).toBe(true)
  })

  it('should include lead handoff summary in agentNotes', async () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
    }

    const req = new Request('http://localhost:7070/api/intake/generate-prefill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    })

    const res = await app.fetch(req)
    const prefill = (await res.json()) as PrefillPacket

    expect(prefill.agentNotes).toBeDefined()
    expect(Array.isArray(prefill.agentNotes)).toBe(true)
    expect(prefill.agentNotes?.length).toBeGreaterThan(0)
  })

  it('should embed disclaimers based on state/product', async () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
    }

    const req = new Request('http://localhost:7070/api/intake/generate-prefill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    })

    const res = await app.fetch(req)
    const prefill = (await res.json()) as PrefillPacket

    expect(prefill.disclaimers.length).toBeGreaterThan(0)
    // Should include CA-specific disclaimers
    expect(prefill.disclaimers.some((d) => d.includes('California'))).toBe(true)
  })

  it('should validate prefill packet against schema', async () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
      vehicles: 2,
      drivers: 1,
    }

    const req = new Request('http://localhost:7070/api/intake/generate-prefill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    })

    const res = await app.fetch(req)
    const prefill = (await res.json()) as PrefillPacket

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
    const req = new Request('http://localhost:7070/api/intake/generate-prefill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invalid: 'data' }),
    })

    const res = await app.fetch(req)
    expect(res.status).toBe(400)

    const error = (await res.json()) as { error?: { code?: string } }
    expect(error.error).toBeDefined()
    expect(error.error?.code).toBe('INVALID_REQUEST')
  })

  it('should handle routing errors gracefully', async () => {
    // Profile with invalid state that might cause routing to fail
    const profile: UserProfile = {
      state: 'XX', // Invalid state code
      productLine: 'auto',
    }

    const req = new Request('http://localhost:7070/api/intake/generate-prefill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    })

    const res = await app.fetch(req)
    // Should still return 200 with prefill packet (routing handled gracefully)
    expect(res.status).toBe(200)

    const prefill = (await res.json()) as PrefillPacket
    expect(prefill.state).toBe('XX')
    expect(prefill.productLine).toBe('auto')
  })
})

describe('Prefill generation integrated with intake endpoint', () => {
  const llmProvider = new GeminiProvider()
  const extractor = new ConversationalExtractor(llmProvider)
  const app = createIntakeRoute(extractor)

  it('should include prefill packet in IntakeResult response', async () => {
    const req = new Request('http://localhost:7070/api/intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'I need auto insurance in California. I have 2 vehicles and 1 driver.',
      }),
    })

    const res = await app.fetch(req)
    expect(res.status).toBe(200)

    const result = (await res.json()) as {
      route?: RouteDecision
      prefill?: PrefillPacket
      complianceValidated?: boolean
    }

    // Prefill packet should be included if routing succeeded
    if (result.route) {
      expect(result.prefill).toBeDefined()
      if (result.prefill) {
        expect(result.prefill.state).toBeDefined()
        expect(result.prefill.productLine).toBeDefined()
        expect(result.prefill.routingDecision).toBeDefined()
      }
    }
  })

  it('should generate prefill packet after compliance check', async () => {
    const req = new Request('http://localhost:7070/api/intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'I need home insurance in Texas. Single family home built in 2000.',
      }),
    })

    const res = await app.fetch(req)
    expect(res.status).toBe(200)

    const result = (await res.json()) as {
      route?: RouteDecision
      prefill?: PrefillPacket
      complianceValidated?: boolean
    }

    // Compliance should be validated
    expect(result.complianceValidated).toBeDefined()

    // Prefill packet should include disclaimers from compliance filter
    if (result.prefill) {
      expect(result.prefill.disclaimers).toBeDefined()
      expect(Array.isArray(result.prefill.disclaimers)).toBe(true)
    }
  })

  it('should include all data from intake flow in prefill packet', async () => {
    const req = new Request('http://localhost:7070/api/intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Name: John Doe, Email: john@example.com, State: CA, Product: auto, Vehicles: 2',
      }),
    })

    const res = await app.fetch(req)
    expect(res.status).toBe(200)

    const result = (await res.json()) as {
      route?: RouteDecision
      prefill?: PrefillPacket
      complianceValidated?: boolean
    }

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
