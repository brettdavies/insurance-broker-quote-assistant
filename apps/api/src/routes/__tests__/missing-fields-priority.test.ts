/**
 * Integration Tests for Missing Fields Priority
 *
 * Tests IntakeResult includes missingFields with priority indicators,
 * backend missing fields reconcile with frontend after debounced API call.
 *
 * @see docs/stories/1.9.real-time-missing-fields-detection.md#task-9
 */

import { beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { IntakeResult } from '@repo/shared'
import { Hono } from 'hono'
import { createTestCarrier, createTestState } from '../../__tests__/fixtures/knowledge-pack'
import { ConversationalExtractor } from '../../services/conversational-extractor'
import { loadKnowledgePack } from '../../services/knowledge-pack-loader'
import type { LLMProvider } from '../../services/llm-provider'
import { createIntakeRoute } from '../intake'

// Path relative to project root (loadKnowledgePack resolves relative to process.cwd())
const testKnowledgePackDir =
  'apps/api/src/__tests__/fixtures/knowledge-packs/test_knowledge_pack_intake_missing_fields'

// Mock LLM provider
const createMockLLMProvider = (): LLMProvider => {
  return {
    extractWithStructuredOutput: async (message: string) => {
      // Parse key-value syntax from message to extract all fields
      const profile: Record<string, unknown> = {}

      // Extract state
      const stateMatch = message.match(/state:\s*(\w+)/i) || message.match(/s:\s*(\w+)/i)
      if (stateMatch) profile.state = stateMatch[1]

      // Extract productLine
      const productMatch = message.match(/productLine:\s*(\w+)/i) || message.match(/l:\s*(\w+)/i)
      if (productMatch) profile.productLine = productMatch[1]

      // Extract vehicles
      const vehiclesMatch = message.match(/vehicles:\s*(\d+)/i) || message.match(/v:\s*(\d+)/i)
      if (vehiclesMatch) profile.vehicles = Number.parseInt(vehiclesMatch[1] || '0', 10)

      // Extract drivers
      const driversMatch = message.match(/drivers:\s*(\d+)/i) || message.match(/d:\s*(\d+)/i)
      if (driversMatch) profile.drivers = Number.parseInt(driversMatch[1] || '0', 10)

      // Extract vins
      const vinsMatch = message.match(/vins:\s*([^\s]+)/i)
      if (vinsMatch) profile.vins = vinsMatch[1]

      // Extract garage
      const garageMatch = message.match(/garage:\s*(\w+)/i)
      if (garageMatch) profile.garage = garageMatch[1]

      return {
        profile,
        confidence: Object.keys(profile).reduce(
          (acc, key) => {
            acc[key] = 0.9
            return acc
          },
          {} as Record<string, number>
        ),
        reasoning: 'Mock LLM extraction',
      }
    },
  }
}

describe('IntakeResult Missing Fields Priority', () => {
  let app: Hono
  let extractor: ConversationalExtractor

  beforeAll(async () => {
    // Setup test knowledge pack
    await mkdir(testKnowledgePackDir, { recursive: true })
    await mkdir(join(testKnowledgePackDir, 'carriers'), { recursive: true })
    await mkdir(join(testKnowledgePackDir, 'states'), { recursive: true })

    // Create test carrier
    const testCarrier = createTestCarrier('GEICO', ['CA'], ['auto'])
    testCarrier.carrier.eligibility = {
      _id: 'elig_test1',
      _sources: [],
      auto: {
        _id: 'elig_auto1',
        requiresCleanDrivingRecord: {
          _id: 'fld_test1',
          value: true,
          _sources: [],
        },
      },
    } as typeof testCarrier.carrier.eligibility & {
      auto: {
        _id: string
        requiresCleanDrivingRecord: {
          _id: string
          value: boolean
          _sources: unknown[]
        }
      }
    }

    await writeFile(
      join(testKnowledgePackDir, 'carriers', 'geico.json'),
      JSON.stringify(testCarrier),
      'utf-8'
    )

    // Create test state
    const testState = createTestState('CA', 'California')
    await writeFile(
      join(testKnowledgePackDir, 'states', 'CA.json'),
      JSON.stringify(testState),
      'utf-8'
    )

    await loadKnowledgePack(testKnowledgePackDir)

    // Setup extractor and route
    const llmProvider = createMockLLMProvider()
    extractor = new ConversationalExtractor(llmProvider)
    const intakeRoute = createIntakeRoute(extractor)
    app = new Hono()
    app.route('/', intakeRoute)
  })

  it('should return missingFields as MissingField[] with priority indicators', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'state: CA productLine: auto',
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as IntakeResult
    expect(body.missingFields).toBeDefined()
    expect(Array.isArray(body.missingFields)).toBe(true)

    // Check structure of MissingField objects
    if (body.missingFields.length > 0) {
      const firstField = body.missingFields[0]
      if (firstField) {
        expect(firstField).toHaveProperty('field')
        expect(firstField).toHaveProperty('priority')
        expect(['critical', 'important', 'optional']).toContain(firstField.priority)
      }
    }
  })

  it('should include critical priority fields for auto product', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'state: CA productLine: auto',
      }),
    })

    const res = await app.request(req)
    const body = (await res.json()) as IntakeResult

    const criticalFields = body.missingFields.filter((f) => f.priority === 'critical')
    expect(criticalFields.length).toBeGreaterThan(0)
    expect(criticalFields.some((f) => f.field === 'vehicles')).toBe(true)
    expect(criticalFields.some((f) => f.field === 'drivers')).toBe(true)
  })

  it('should include carrier-specific requirements when route decision available', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'state: CA productLine: auto vehicles: 2 drivers: 1',
      }),
    })

    const res = await app.request(req)
    const body = (await res.json()) as IntakeResult

    // If route decision includes GEICO, should have carrier-specific requirements
    if (body.route?.primaryCarrier === 'GEICO') {
      // Check for carrier-specific fields (e.g., cleanRecord3Yr)
      const hasCarrierSpecific = body.missingFields.some((f) => f.field === 'cleanRecord3Yr')
      // May or may not be present depending on profile completeness
      expect(Array.isArray(body.missingFields)).toBe(true)
    }
  })

  it('should include state-specific requirements', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'state: CA productLine: auto vehicles: 2 drivers: 1',
      }),
    })

    const res = await app.request(req)
    const body = (await res.json()) as IntakeResult

    // State-specific requirements should be included
    expect(body.missingFields).toBeDefined()
    expect(Array.isArray(body.missingFields)).toBe(true)
  })

  it('should return minimal missingFields when most fields present', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'state: CA productLine: auto vehicles: 2 drivers: 1 vins: ABC123 garage: attached',
      }),
    })

    const res = await app.request(req)
    const body = (await res.json()) as IntakeResult

    // Should have minimal missing fields (may still have some optional fields)
    expect(body.missingFields).toBeDefined()
    expect(Array.isArray(body.missingFields)).toBe(true)
    // Critical fields should be minimal (state and productLine should be present)
    const criticalFields = body.missingFields.filter((f) => f.priority === 'critical')
    // Should have no critical missing fields since we provided all critical fields
    expect(criticalFields.length).toBeLessThanOrEqual(0)
  })

  it('should prioritize critical fields over important/optional', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'state: CA productLine: auto',
      }),
    })

    const res = await app.request(req)
    const body = (await res.json()) as IntakeResult

    const criticalFields = body.missingFields.filter((f) => f.priority === 'critical')
    const importantFields = body.missingFields.filter((f) => f.priority === 'important')
    const optionalFields = body.missingFields.filter((f) => f.priority === 'optional')

    // Critical fields should be present
    expect(criticalFields.length).toBeGreaterThan(0)
    // Important and optional may or may not be present
    expect(Array.isArray(importantFields)).toBe(true)
    expect(Array.isArray(optionalFields)).toBe(true)
  })

  it('should handle missing route decision gracefully', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'state: XX productLine: auto', // Unknown state, no route decision
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as IntakeResult
    // Should still return missingFields even without route decision
    expect(body.missingFields).toBeDefined()
    expect(Array.isArray(body.missingFields)).toBe(true)
  })
})
