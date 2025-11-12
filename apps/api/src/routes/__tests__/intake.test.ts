import { beforeEach, describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { ConversationalExtractor } from '../../services/conversational-extractor'
import { createIntakeRoute } from '../intake'
import { createMockLLMProvider } from '@repo/shared/test-utils'
import { TestClient, expectSuccessResponse, expectErrorResponse, expectIntakeResult, expectErrorBody } from '../helpers'

describe('POST /api/intake', () => {
  let app: Hono
  let extractor: ConversationalExtractor
  let client: TestClient

  beforeEach(() => {
    const mockLLMProvider = createMockLLMProvider()
    extractor = new ConversationalExtractor(mockLLMProvider)
    const intakeRoute = createIntakeRoute(extractor)
    app = new Hono()
    app.route('/', intakeRoute)
    client = new TestClient(app)
  })

  it('should return 400 for invalid request body', async () => {
    const res = await client.post('/api/intake', { invalid: 'data' })
    expectErrorResponse(res, 400)

    const body = await res.json()
    expectErrorBody(body, 'INVALID_REQUEST')
  })

  it('should return 400 for missing message field', async () => {
    const res = await client.post('/api/intake', { conversationHistory: [] })
    expectErrorResponse(res, 400)
  })

  it('should extract fields from key-value syntax', async () => {
    const body = await client.postJson('/api/intake', {
      message: 's:CA a:30 l:auto',
    })
    expectIntakeResult(body)
    expect(body.profile.state).toBe('CA')
    expect(body.profile.age).toBe(30)
    expect(body.profile.productLine).toBe('auto')
    expect(body.extractionMethod).toBe('key-value')
  })

  it('should extract fields from natural language using LLM', async () => {
    const body = await client.postJson('/api/intake', {
      message: 'I need auto insurance in California',
    })
    expectIntakeResult(body)
  })

  it('should accept conversation history', async () => {
    const body = await client.postJson('/api/intake', {
      message: 's:CA',
      conversationHistory: ['Previous message 1', 'Previous message 2'],
    })
    expectIntakeResult(body)
  })

  it('should return IntakeResult with all required fields', async () => {
    const body = await client.postJson('/api/intake', {
      message: 's:CA l:auto',
    })
    expectIntakeResult(body)
    expect(body.extractionMethod === 'key-value' || body.extractionMethod === 'llm').toBe(true)
    expect(body.complianceValidated).toBe(true)
    expect(body.trace).toBeDefined()
    expect(body.trace?.timestamp).toBeDefined()
    expect(body.trace?.flow).toBe('conversational')
  })

  describe('Routing integration', () => {
    it('should include RouteDecision in response when state and productLine are present', async () => {
      const body = await client.postJson<{ route?: { primaryCarrier?: string; eligibleCarriers?: string[]; confidence?: number; rationale?: string; citations?: Array<{ id: string; type: string; carrier: string; file: string }> } }>('/api/intake', {
        message: 's:CA l:auto a:30',
      })
      expectIntakeResult(body)
      expect(body.route).toBeDefined()
      expect(body.route?.primaryCarrier).toBeDefined()
      expect(Array.isArray(body.route?.eligibleCarriers)).toBe(true)
      expect(typeof body.route?.confidence).toBe('number')
      expect(body.route?.confidence).toBeGreaterThanOrEqual(0)
      expect(body.route?.confidence).toBeLessThanOrEqual(1)
      expect(body.route?.rationale).toBeDefined()
      expect(Array.isArray(body.route?.citations)).toBe(true)
    })

    it('should handle routing when no eligible carriers found', async () => {
      const body = await client.postJson<{ route?: { eligibleCarriers?: string[]; confidence?: number; rationale?: string } }>('/api/intake', {
        message: 's:WY l:renters',
      })
      expectIntakeResult(body)
      // Route decision should still be present, but with empty eligible carriers
      expect(body.route).toBeDefined()
      if (body.route) {
        expect(Array.isArray(body.route.eligibleCarriers)).toBe(true)
        expect(body.route.confidence).toBe(0.0)
        expect(body.route.rationale).toContain('No carriers available')
      }
    })

    it('should include routing decision in decision trace', async () => {
      const body = await client.postJson<{
        trace?: {
          routingDecision?: {
            eligibleCarriers?: string[]
            primaryCarrier?: string
            confidence?: number
            rationale?: string
            citations?: unknown[]
            rulesEvaluated?: string[]
          }>('/api/intake', {
          message: 's:CA l:auto a:30',
        })
      expectIntakeResult(body)
        }
      }
      expect(body.trace?.routingDecision).toBeDefined()
      expect(Array.isArray(body.trace?.routingDecision?.eligibleCarriers)).toBe(true)
      expect(body.trace?.routingDecision?.primaryCarrier).toBeDefined()
      expect(typeof body.trace?.routingDecision?.confidence).toBe('number')
      expect(body.trace?.routingDecision?.rationale).toBeDefined()
      expect(Array.isArray(body.trace?.routingDecision?.citations)).toBe(true)
      expect(Array.isArray(body.trace?.routingDecision?.rulesEvaluated)).toBe(true)
    })

    it('should filter carriers by credit score eligibility', async () => {
      const body = await client.postJson<{
        route?: {
          eligibleCarriers?: string[]
          rationale?: string
        }>('/api/intake', {
          message: 's:CA l:auto a:30 creditScore:650',
        })
      expectIntakeResult(body)
        profile?: {
          creditScore?: number
        }
      }
      expect(body.profile?.creditScore).toBe(650)
      expect(body.route).toBeDefined()
      // Routing should work with credit score provided
      expect(body.route?.eligibleCarriers).toBeDefined()
    })

    it('should filter carriers by property type eligibility for home insurance', async () => {
      const body = await client.postJson<{
        route?: {
          eligibleCarriers?: string[]
        }>('/api/intake', {
          message: 's:CA l:home propertyType:single-family',
        })
      expectIntakeResult(body)
        profile?: {
          propertyType?: string
        }
      }
      expect(body.profile?.propertyType).toBe('single-family')
      expect(body.route).toBeDefined()
      expect(body.route?.eligibleCarriers).toBeDefined()
    })

    it('should filter carriers by driving record eligibility for auto insurance', async () => {
      const body = await client.postJson<{
        route?: {
          eligibleCarriers?: string[]
        }>('/api/intake', {
          message: 's:CA l:auto cleanRecord3Yr:true',
        })
      expectIntakeResult(body)
        profile?: {
          cleanRecord3Yr?: boolean
        }
      }
      expect(body.profile?.cleanRecord3Yr).toBe(true)
      expect(body.route).toBeDefined()
      expect(body.route?.eligibleCarriers).toBeDefined()
    })
  })

  describe('Compliance filter integration', () => {
    it('should include compliance check in response', async () => {
      const body = await client.postJson<{
        complianceValidated?: boolean
        disclaimers?: string[]
      }>('/api/intake', {
          message: 's:CA l:auto',
        })
      expectIntakeResult(body)
      expect(body.complianceValidated).toBeDefined()
      expect(typeof body.complianceValidated).toBe('boolean')
      expect(body.disclaimers).toBeDefined()
      expect(Array.isArray(body.disclaimers)).toBe(true)
    })

    it('should include disclaimers in IntakeResult response', async () => {
      const body = await client.postJson<{
        disclaimers?: string[]
        profile?: { state?: string; productLine?: string }>('/api/intake', {
          message: 's:CA l:auto',
        })
      expectIntakeResult(body)
      }
      expect(body.disclaimers).toBeDefined()
      expect(Array.isArray(body.disclaimers)).toBe(true)
      expect(body.disclaimers?.length).toBeGreaterThan(0)
      // Should include base disclaimers
      expect(body.disclaimers?.some((d) => d.includes('subject to underwriting'))).toBe(true)
    })

    it('should select state-specific disclaimers for CA', async () => {
      const body = await client.postJson<{
        disclaimers?: string[]
      }>('/api/intake', {
          message: 's:CA',
        })
      expectIntakeResult(body)
      expect(body.disclaimers).toBeDefined()
      expect(body.disclaimers?.some((d) => d.includes('California'))).toBe(true)
    })

    it('should select product-specific disclaimers for auto', async () => {
      const body = await client.postJson<{
        disclaimers?: string[]
      }>('/api/intake', {
          message: 'l:auto',
        })
      expectIntakeResult(body)
      expect(body.disclaimers).toBeDefined()
      expect(body.disclaimers?.some((d) => d.includes('Auto Insurance'))).toBe(true)
    })

    it('should combine state and product disclaimers', async () => {
      const body = await client.postJson<{
        disclaimers?: string[]
      }>('/api/intake', {
          message: 's:CA l:auto',
        })
      expectIntakeResult(body)
      expect(body.disclaimers).toBeDefined()
      expect(body.disclaimers?.some((d) => d.includes('California'))).toBe(true)
      expect(body.disclaimers?.some((d) => d.includes('Auto Insurance'))).toBe(true)
    })

    it('should log compliance check to decision trace', async () => {
      const body = await client.postJson<{
        trace?: {
          complianceCheck?: {
            passed?: boolean
            violations?: string[]
            disclaimersAdded?: number
            state?: string
            productLine?: string
          }>('/api/intake', {
          message: 's:CA l:auto',
        })
      expectIntakeResult(body)
        }
      }
      expect(body.trace?.complianceCheck).toBeDefined()
      expect(body.trace?.complianceCheck?.passed).toBeDefined()
      expect(typeof body.trace?.complianceCheck?.passed).toBe('boolean')
      expect(body.trace?.complianceCheck?.disclaimersAdded).toBeDefined()
      expect(typeof body.trace?.complianceCheck?.disclaimersAdded).toBe('number')
      expect(body.trace?.complianceCheck?.state).toBe('CA')
      expect(body.trace?.complianceCheck?.productLine).toBe('auto')
    })

    it('should run compliance filter on pitch before returning to frontend', async () => {
      const body = await client.postJson<{
        pitch?: string
        complianceValidated?: boolean
      }>('/api/intake', {
          message: 's:CA l:auto',
        })
      expectIntakeResult(body)
      // Pitch should be present (currently empty string for MVP)
      expect(body.pitch).toBeDefined()
      expect(typeof body.pitch).toBe('string')
      // Compliance should be validated
      expect(body.complianceValidated).toBe(true)
    })

    it('should block prohibited phrases end-to-end and replace with handoff message', async () => {
      // Set NODE_ENV to test to enable testPitch injection
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'

      try {
        const body = await client.postJson<{
          pitch?: string
          complianceValidated?: boolean
          trace?: {
            complianceCheck?: {
              passed?: boolean
              violations?: string[]
            }>('/api/intake', {
            message: 's:CA l:auto',
            testPitch: 'We guarantee the lowest rate for your auto insurance!',
          })
      expectIntakeResult(body)
          }
        }

        // Compliance check should have failed
        expect(body.complianceValidated).toBe(false)

        // Pitch should be replaced with licensed agent handoff message
        expect(body.pitch).toBeDefined()
        expect(body.pitch).toContain('licensed insurance agent')
        expect(body.pitch).toContain('contact your broker')

        // Violations should be logged in decision trace
        expect(body.trace?.complianceCheck).toBeDefined()
        expect(body.trace?.complianceCheck?.passed).toBe(false)
        expect(body.trace?.complianceCheck?.violations).toBeDefined()
        expect(Array.isArray(body.trace?.complianceCheck?.violations)).toBe(true)
        expect(body.trace?.complianceCheck?.violations?.length).toBeGreaterThan(0)
        expect(
          body.trace?.complianceCheck?.violations?.some((v) =>
            v.toLowerCase().includes('guarantee')
          )
        ).toBe(true)
      } finally {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should detect multiple prohibited phrases and log all violations', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'

      try {
        const body = await client.postJson<{
          complianceValidated?: boolean
          trace?: {
            complianceCheck?: {
              passed?: boolean
              violations?: string[]
            }>('/api/intake', {
            message: 's:TX l:home',
            testPitch:
              'We guarantee the best price guaranteed and you will save money with our binding quote!',
          })
      expectIntakeResult(body)
          }
        }

        // Compliance check should have failed
        expect(body.complianceValidated).toBe(false)

        // Should detect multiple violations
        expect(body.trace?.complianceCheck?.violations).toBeDefined()
        expect(body.trace?.complianceCheck?.violations?.length).toBeGreaterThan(1)
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should pass compliance check for valid pitch without prohibited phrases', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'

      try {
        const body = await client.postJson<{
          pitch?: string
          complianceValidated?: boolean
          trace?: {
            complianceCheck?: {
              passed?: boolean
              violations?: string[]
            }>('/api/intake', {
            message: 's:FL l:renters',
            testPitch:
              'Based on your profile, we have found several insurance options that may meet your needs. Rates are subject to underwriting and approval.',
          })
      expectIntakeResult(body)
          }
        }

        // Compliance check should have passed
        expect(body.complianceValidated).toBe(true)

        // Original pitch should be preserved (not replaced)
        expect(body.pitch).toBeDefined()
        expect(body.pitch).toContain('Based on your profile')

        // No violations should be logged
        expect(body.trace?.complianceCheck?.passed).toBe(true)
        expect(body.trace?.complianceCheck?.violations).toBeUndefined()
      } finally {
        process.env.NODE_ENV = originalEnv
      }
    })
  })
})
