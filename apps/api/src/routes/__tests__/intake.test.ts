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
})

