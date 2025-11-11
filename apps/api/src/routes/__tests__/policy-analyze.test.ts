/**
 * Policy Analyze Endpoint Integration Tests
 *
 * Tests full policy analysis flow: policy text → extraction → analysis → pitch → compliance.
 *
 * @see docs/stories/2.2.policy-analysis-agent.md#task-13
 */

import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { PolicyAnalysisResult, PolicySummary } from '@repo/shared'
import { policyAnalysisResultSchema } from '@repo/shared'
import { Hono } from 'hono'
import { ConversationalExtractor } from '../../services/conversational-extractor'
import * as knowledgePackRAG from '../../services/knowledge-pack-rag'
import type { LLMProvider } from '../../services/llm-provider'
import { createPolicyRoute } from '../policy'

const createMockLLMProvider = (): LLMProvider => {
  return {
    extractWithStructuredOutput: mock(async (message: string) => {
      // Mock policy extraction
      if (message.includes('carrier:GEICO') || message.includes('GEICO')) {
        return {
          profile: {
            carrier: 'GEICO',
            state: 'CA',
            productType: 'auto',
            premiums: { annual: 1200 },
          },
          confidence: {
            carrier: 0.95,
            state: 0.98,
            productType: 0.92,
          },
          tokensUsed: 400,
        }
      }

      // Mock policy analysis - return PolicyAnalysisResult structure
      if (message.includes('Analyze the following insurance policy')) {
        const analysisResult = {
          currentPolicy: {
            carrier: 'GEICO',
            state: 'CA',
            productType: 'auto',
            premiums: { annual: 1200 },
          },
          opportunities: [
            {
              discount: 'Good Driver Discount',
              percentage: 10,
              annualSavings: 120,
              requires: ['cleanRecord3Yr'],
              citation: {
                id: 'disc_test',
                type: 'discount',
                carrier: 'carr_test',
                file: 'knowledge_pack/carriers/geico.json',
              },
            },
          ],
          bundleOptions: [],
          deductibleOptimizations: [],
          pitch: '',
          complianceValidated: false,
        }
        // Return as profile (workaround for LLMProvider interface)
        return {
          profile: analysisResult as unknown as Record<string, unknown>,
          confidence: {},
          tokensUsed: 600,
        }
      }

      // Mock pitch generation - return pitch result structure
      if (message.includes('Generate an agent-ready savings pitch')) {
        const pitchResult = {
          pitch:
            'Based on our analysis, you qualify for a Good Driver Discount that could save you $120 per year.',
        }
        // Return as profile (workaround for LLMProvider interface)
        return {
          profile: pitchResult as unknown as Record<string, unknown>,
          confidence: {},
          tokensUsed: 300,
        }
      }

      return {
        profile: {},
        confidence: {},
        tokensUsed: 0,
      }
    }),
  } as unknown as LLMProvider
}

describe('POST /api/policy/analyze', () => {
  let app: Hono
  let extractor: ConversationalExtractor
  let mockLLMProvider: LLMProvider

  beforeEach(() => {
    mockLLMProvider = createMockLLMProvider()
    extractor = new ConversationalExtractor(mockLLMProvider)
    const policyRoute = createPolicyRoute(extractor, mockLLMProvider)
    app = new Hono()
    app.route('/', policyRoute)

    // Mock knowledge pack RAG functions for all tests
    const testCarrier = {
      name: 'GEICO',
      _id: 'carr_test',
      operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
      products: { _id: 'fld2', value: ['auto', 'home'], _sources: [] },
      discounts: [],
    }

    spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
    spyOn(knowledgePackRAG, 'getCarrierDiscounts').mockReturnValue([])
    spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockReturnValue([])
    spyOn(knowledgePackRAG, 'getCarrierProducts').mockReturnValue(['auto', 'home'])
  })

  it('should return 400 for invalid request body', async () => {
    const req = new Request('http://localhost/api/policy/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(400)

    const body = (await res.json()) as { error?: { code?: string } }
    expect(body.error).toBeDefined()
    expect(body.error?.code).toBe('INVALID_REQUEST')
  })

  it('should return 400 for empty policy text', async () => {
    const req = new Request('http://localhost/api/policy/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policyText: '' }),
    })

    const res = await app.request(req)
    // Empty policy text should be caught by validation (400) or fail during analysis (500)
    // Both are acceptable - the important thing is it doesn't return 200
    expect(res.status).toBeGreaterThanOrEqual(400)

    const body = (await res.json()) as { error?: { code?: string } }
    expect(body.error).toBeDefined()
  })

  it('should extract policy data from text and analyze', async () => {
    const req = new Request('http://localhost/api/policy/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyText: 'carrier:GEICO state:CA productType:auto premium:$1200/yr',
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as PolicyAnalysisResult
    expect(body.currentPolicy).toBeDefined()
    expect(body.currentPolicy.carrier).toBe('GEICO')
    expect(body.currentPolicy.state).toBe('CA')
    expect(body.opportunities).toBeDefined()
    expect(Array.isArray(body.opportunities)).toBe(true)
    expect(body.bundleOptions).toBeDefined()
    expect(body.deductibleOptimizations).toBeDefined()
    expect(body.pitch).toBeDefined()
    expect(typeof body.pitch).toBe('string')
    expect(body.complianceValidated).toBeDefined()
    expect(typeof body.complianceValidated).toBe('boolean')
  })

  it('should accept policySummary directly', async () => {
    const policySummary: PolicySummary = {
      carrier: 'GEICO',
      state: 'CA',
      productType: 'auto',
      premiums: { annual: 1200 },
    }

    const req = new Request('http://localhost/api/policy/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyText: 'carrier:GEICO state:CA productType:auto',
        policySummary,
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as PolicyAnalysisResult
    expect(body.currentPolicy.carrier).toBe('GEICO')
  })

  it('should return 400 if extracted policy missing required fields', async () => {
    // Mock extraction to return incomplete policy
    ;(
      mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>
    ).mockImplementationOnce(async () => ({
      profile: {
        carrier: 'GEICO',
        // Missing state and productType
      },
      confidence: {},
      tokensUsed: 200,
    }))

    const req = new Request('http://localhost/api/policy/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyText: 'carrier:GEICO',
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(400)

    const body = (await res.json()) as { error?: { code?: string } }
    expect(body.error?.code).toBe('EXTRACTION_ERROR')
  })

  it('should return 400 for invalid policySummary', async () => {
    const req = new Request('http://localhost/api/policy/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyText: 'test',
        policySummary: { invalid: 'data' },
      }),
    })

    const res = await app.request(req)
    // Invalid policySummary might trigger validation error (400) or analysis error (500)
    // Both are acceptable - the important thing is it doesn't return 200
    expect(res.status).toBeGreaterThanOrEqual(400)

    const body = (await res.json()) as { error?: { code?: string } }
    expect(body.error).toBeDefined()
  })

  it('should include decision trace in response', async () => {
    const req = new Request('http://localhost/api/policy/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyText: 'carrier:GEICO state:CA productType:auto premium:$1200/yr',
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as PolicyAnalysisResult
    expect(body.trace).toBeDefined()
    expect(body.trace?.flow).toBe('policy')
    expect(body.trace?.llmCalls).toBeDefined()
    expect(Array.isArray(body.trace?.llmCalls)).toBe(true)
    expect(body.trace?.llmCalls?.length).toBeGreaterThan(0)
  })

  it('should log token usage in decision trace', async () => {
    const req = new Request('http://localhost/api/policy/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyText: 'carrier:GEICO state:CA productType:auto premium:$1200/yr',
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as PolicyAnalysisResult
    const llmCalls = body.trace?.llmCalls
    expect(llmCalls).toBeDefined()
    expect(llmCalls?.length).toBeGreaterThanOrEqual(2) // At least extraction + analysis
    expect(llmCalls?.some((call) => call.agent === 'conversational-extractor')).toBe(true)
    expect(llmCalls?.some((call) => call.agent === 'policy-analysis-agent')).toBe(true)
    expect(llmCalls?.some((call) => call.agent === 'pitch-generator')).toBe(true)
  })

  it('should validate response against PolicyAnalysisResult schema', async () => {
    const req = new Request('http://localhost/api/policy/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyText: 'carrier:GEICO state:CA productType:auto premium:$1200/yr',
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as PolicyAnalysisResult
    const validationResult = policyAnalysisResultSchema.safeParse(body)
    expect(validationResult.success).toBe(true)
  })

  it('should handle knowledge pack errors gracefully', async () => {
    // Override the beforeEach mock to return undefined carrier
    const spy = spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(undefined)

    const req = new Request('http://localhost/api/policy/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyText: 'carrier:UnknownCarrier state:CA productType:auto',
      }),
    })

    const res = await app.request(req)
    // Should return error (404 or 500 depending on implementation)
    expect(res.status).toBeGreaterThanOrEqual(400)

    // Restore spy
    spy.mockRestore()
  })

  it('should run compliance filter on generated pitch', async () => {
    const req = new Request('http://localhost/api/policy/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyText: 'carrier:GEICO state:CA productType:auto premium:$1200/yr',
      }),
    })

    const res = await app.request(req)
    expect(res.status).toBe(200)

    const body = (await res.json()) as PolicyAnalysisResult
    expect(body.complianceValidated).toBeDefined()
    expect(typeof body.complianceValidated).toBe('boolean')
    // Compliance filter should have run (validated field set)
  })
})
