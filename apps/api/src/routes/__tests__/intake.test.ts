import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { createIntakeRoute } from '../intake'
import { ConversationalExtractor } from '../../services/conversational-extractor'
import type { LLMProvider } from '../../services/llm-provider'

// Mock LLM provider
const createMockLLMProvider = (): LLMProvider => {
  return {
    extractWithStructuredOutput: async () => ({
      profile: {
        state: 'CA',
        productLine: 'auto',
      },
      confidence: {
        state: 0.9,
        productLine: 0.8,
      },
      reasoning: 'Mock LLM extraction',
    }),
  }
}

describe('POST /api/intake', () => {
  let app: Hono
  let extractor: ConversationalExtractor

  beforeEach(() => {
    const mockLLMProvider = createMockLLMProvider()
    extractor = new ConversationalExtractor(mockLLMProvider)
    const intakeRoute = createIntakeRoute(extractor)
    app = new Hono()
    app.route('/', intakeRoute)
  })

  it('should return 400 for invalid request body', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(400)

    const body = (await res.json()) as { error?: { code?: string } }
    expect(body.error).toBeDefined()
    expect(body.error?.code).toBe('INVALID_REQUEST') // Route returns INVALID_REQUEST for validation errors
  })

  it('should return 400 for missing message field', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationHistory: [] }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(400)
  })

  it('should extract fields from key-value syntax', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 's:CA a:30 l:auto',
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      profile?: { state?: string; age?: number; productLine?: string }
      extractionMethod?: string
      confidence?: Record<string, number>
      missingFields?: string[]
    }
    expect(body.profile).toBeDefined()
    expect(body.profile?.state).toBe('CA')
    expect(body.profile?.age).toBe(30)
    expect(body.profile?.productLine).toBe('auto')
    expect(body.extractionMethod).toBe('key-value') // AC5: extraction method in response
    expect(body.confidence).toBeDefined() // AC5: confidence scores in response
    expect(body.missingFields).toBeDefined()
    expect(Array.isArray(body.missingFields)).toBe(true)
  })

  it('should extract fields from natural language using LLM', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I need auto insurance in California',
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      profile?: unknown
      missingFields?: unknown[]
    }
    expect(body.profile).toBeDefined()
    expect(body.missingFields).toBeDefined()
    expect(Array.isArray(body.missingFields)).toBe(true)
  })

  it('should accept conversation history', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 's:CA',
        conversationHistory: ['Previous message 1', 'Previous message 2'],
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as { profile?: unknown }
    expect(body.profile).toBeDefined()
  })

  it('should return IntakeResult with all required fields', async () => {
    const req = new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 's:CA l:auto',
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      profile?: unknown
      missingFields?: unknown[]
      extractionMethod?: string
      confidence?: Record<string, number>
      complianceValidated?: boolean
      trace?: { timestamp?: string; flow?: string }
    }
    expect(body.profile).toBeDefined()
    expect(body.missingFields).toBeDefined()
    expect(Array.isArray(body.missingFields)).toBe(true)
    expect(body.extractionMethod).toBeDefined() // AC5: extraction method in response
    expect(body.extractionMethod === 'key-value' || body.extractionMethod === 'llm').toBe(true)
    expect(body.confidence).toBeDefined() // AC5: confidence scores in response
    expect(body.complianceValidated).toBe(true)
    expect(body.trace).toBeDefined()
    expect(body.trace?.timestamp).toBeDefined()
    expect(body.trace?.flow).toBe('conversational')
  })

  describe('Routing integration', () => {
    it('should include RouteDecision in response when state and productLine are present', async () => {
      const req = new Request('http://localhost/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 's:CA l:auto a:30',
        }),
      })

      const res = await app.request(req)
      expect(res.status).toBe(200)

      const body = (await res.json()) as {
        route?: {
          primaryCarrier?: string
          eligibleCarriers?: string[]
          confidence?: number
          rationale?: string
          citations?: Array<{ id: string; type: string; carrier: string; file: string }>
        }
      }
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
      const req = new Request('http://localhost/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 's:WY l:renters',
        }),
      })

      const res = await app.request(req)
      expect(res.status).toBe(200)

      const body = (await res.json()) as {
        route?: {
          eligibleCarriers?: string[]
          confidence?: number
          rationale?: string
        }
      }
      // Route decision should still be present, but with empty eligible carriers
      expect(body.route).toBeDefined()
      if (body.route) {
        expect(Array.isArray(body.route.eligibleCarriers)).toBe(true)
        expect(body.route.confidence).toBe(0.0)
        expect(body.route.rationale).toContain('No carriers available')
      }
    })

    it('should include routing decision in decision trace', async () => {
      const req = new Request('http://localhost/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 's:CA l:auto a:30',
        }),
      })

      const res = await app.request(req)
      expect(res.status).toBe(200)

      const body = (await res.json()) as {
        trace?: {
          routingDecision?: {
            eligibleCarriers?: string[]
            primaryCarrier?: string
            confidence?: number
            rationale?: string
            citations?: unknown[]
            rulesEvaluated?: string[]
          }
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
      const req = new Request('http://localhost/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 's:CA l:auto a:30 creditScore:650',
        }),
      })

      const res = await app.request(req)
      expect(res.status).toBe(200)

      const body = (await res.json()) as {
        route?: {
          eligibleCarriers?: string[]
          rationale?: string
        }
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
      const req = new Request('http://localhost/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 's:CA l:home propertyType:single-family',
        }),
      })

      const res = await app.request(req)
      expect(res.status).toBe(200)

      const body = (await res.json()) as {
        route?: {
          eligibleCarriers?: string[]
        }
        profile?: {
          propertyType?: string
        }
      }
      expect(body.profile?.propertyType).toBe('single-family')
      expect(body.route).toBeDefined()
      expect(body.route?.eligibleCarriers).toBeDefined()
    })

    it('should filter carriers by driving record eligibility for auto insurance', async () => {
      const req = new Request('http://localhost/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 's:CA l:auto cleanRecord3Yr:true',
        }),
      })

      const res = await app.request(req)
      expect(res.status).toBe(200)

      const body = (await res.json()) as {
        route?: {
          eligibleCarriers?: string[]
        }
        profile?: {
          cleanRecord3Yr?: boolean
        }
      }
      expect(body.profile?.cleanRecord3Yr).toBe(true)
      expect(body.route).toBeDefined()
      expect(body.route?.eligibleCarriers).toBeDefined()
    })
  })
})

