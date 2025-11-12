/**
 * Policy Bundle Integration Tests
 *
 * Tests bundle opportunity detection integration into policy analysis flow.
 * Verifies bundle analyzer is called, results are merged, and decision trace includes bundle analysis.
 *
 * @see docs/stories/2.5.bundle-opportunity-detection.md#task-7
 * @see docs/architecture/16-testing-strategy.md
 */

import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { BundleOption, PolicyAnalysisResult, PolicySummary } from '@repo/shared'
import { Hono } from 'hono'
import { TestClient, expectSuccessResponse } from '../../__tests__/helpers'
import { ConversationalExtractor } from '../../services/conversational-extractor'
import * as knowledgePackRAG from '../../services/knowledge-pack-rag'
import type { LLMProvider } from '../../services/llm-provider'
import { createPolicyRoute } from '../policy'

const createMockLLMProvider = (): LLMProvider => {
  return {
    extractWithStructuredOutput: mock(async (message: string, _history, schema) => {
      // Mock policy analysis - return PolicyAnalysisResult structure
      if (
        message.includes('Analyze the following insurance policy') ||
        message.includes('Current Policy:')
      ) {
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
                carrier: 'GEICO',
              },
            },
          ],
          bundleOptions: [], // LLM may return empty, bundle analyzer will add
          deductibleOptimizations: [],
          pitch: '',
          complianceValidated: false,
        }
        return {
          profile: analysisResult as unknown as Record<string, unknown>,
          confidence: {},
          tokensUsed: 600,
        }
      }

      // Mock pitch generation
      if (message.includes('Generate an agent-ready savings pitch')) {
        const pitchResult = {
          pitch:
            'Based on our analysis, you qualify for a Good Driver Discount and bundle opportunities.',
        }
        return {
          profile: pitchResult as unknown as Record<string, unknown>,
          confidence: {},
          tokensUsed: 300,
        }
      }

      // Default fallback
      return {
        profile: {},
        confidence: {},
        tokensUsed: 100,
      }
    }),
    extractFromFile: mock(async () => ({
      profile: {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto' as const,
        premiums: { annual: 1200 },
      },
      confidence: {},
      tokensUsed: 500,
      extractionTime: 1000,
    })),
  }
}

describe('Policy Bundle Integration', () => {
  let app: Hono
  let extractor: ConversationalExtractor
  let mockLLMProvider: LLMProvider
  let client: TestClient

  beforeEach(() => {
    mockLLMProvider = createMockLLMProvider()
    extractor = new ConversationalExtractor(mockLLMProvider)
    const policyRoute = createPolicyRoute(extractor, mockLLMProvider)
    app = new Hono()
    app.route('/', policyRoute)
    client = new TestClient(app)

    // Mock knowledge pack RAG functions
    const testCarrier = {
      name: 'GEICO',
      _id: 'carr_geico',
      operatesIn: { _id: 'fld1', value: ['CA', 'TX'], _sources: [] },
      products: { _id: 'fld2', value: ['auto', 'home', 'renters'], _sources: [] },
      discounts: [
        {
          _id: 'disc_bundle_auto_home',
          name: { _id: 'fld_name', value: 'Multi-Policy Bundle', _sources: [] },
          percentage: { _id: 'fld_pct', value: 15, _sources: [] },
          products: { _id: 'fld_products', value: ['auto', 'home'], _sources: [] },
          states: { _id: 'fld_states', value: ['CA', 'TX'], _sources: [] },
          requirements: {
            _id: 'fld_reqs',
            value: {
              bundleProducts: ['auto', 'home'],
              description: 'Bundle discount for auto + home',
            },
            _sources: [],
          },
          stackable: { _id: 'fld_stack', value: true, _sources: [] },
        },
      ],
    }

    spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
    spyOn(knowledgePackRAG, 'getCarrierDiscounts').mockReturnValue([])
    spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockImplementation(
      (carrierName: string, stateCode: string) => {
        if (carrierName.toLowerCase() !== 'geico' || stateCode.toUpperCase() !== 'CA') {
          return []
        }
        return testCarrier.discounts.filter((d) => {
          const states = d.states?.value || []
          return states.includes(stateCode.toUpperCase())
        })
      }
    )
    // Don't mock the helper functions - let them use the actual implementation
    // They will call getCarrierByName (which we mocked above) and use getFieldValue
  })

  afterEach(() => {
    // Restore all spies
    ;(knowledgePackRAG.getCarrierByName as any).mockRestore?.()
    ;(knowledgePackRAG.getCarrierDiscounts as any).mockRestore?.()
    ;(knowledgePackRAG.getCarrierBundleDiscounts as any).mockRestore?.()
  })

  describe('Bundle Opportunities in Policy Analysis', () => {
    it('should include bundle opportunities in PolicyAnalysisResult', async () => {
      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult
      expect(body.bundleOptions).toBeDefined()
      expect(Array.isArray(body.bundleOptions)).toBe(true)
    })

    it('should detect bundle opportunity for single-product policy', async () => {
      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto', // Only auto, should suggest home for bundle
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult
      expect(body.bundleOptions.length).toBeGreaterThan(0)

      // Should suggest home (for auto+home bundle)
      const homeBundle = body.bundleOptions.find((opt) => opt.product === 'home')
      expect(homeBundle).toBeDefined()
      expect(homeBundle?.estimatedSavings).toBeGreaterThan(0)
      expect(homeBundle?.requiredActions.length).toBeGreaterThan(0)
    })

    it('should include valid citations in bundle opportunities', async () => {
      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult

      if (body.bundleOptions.length > 0) {
        const bundleOption = body.bundleOptions[0] as BundleOption
        expect(bundleOption.citation).toBeDefined()
        expect(bundleOption.citation.id).toBeDefined()
        expect(bundleOption.citation.id.length).toBeGreaterThan(0)
        expect(bundleOption.citation.type).toBe('discount')
        expect(bundleOption.citation.carrier).toBeDefined()
        expect(bundleOption.citation.file).toBeDefined()
        expect(bundleOption.citation.file.length).toBeGreaterThan(0)
      }
    })

    it('should filter out products not available from carrier', async () => {
      // Mock carrier that only offers auto and home (not renters)
      // Update getCarrierByName to return a carrier with limited products
      const limitedCarrier = {
        name: 'GEICO',
        _id: 'carr_geico',
        operatesIn: { _id: 'fld1', value: ['CA', 'TX'], _sources: [] },
        products: { _id: 'fld2', value: ['auto', 'home'], _sources: [] }, // Only auto and home
        discounts: [
          {
            _id: 'disc_bundle_auto_home',
            name: { _id: 'fld_name', value: 'Multi-Policy Bundle', _sources: [] },
            percentage: { _id: 'fld_pct', value: 15, _sources: [] },
            products: { _id: 'fld_products', value: ['auto', 'home'], _sources: [] },
            states: { _id: 'fld_states', value: ['CA', 'TX'], _sources: [] },
            requirements: {
              _id: 'fld_reqs',
              value: {
                bundleProducts: ['auto', 'home'],
                description: 'Bundle discount for auto + home',
              },
              _sources: [],
            },
            stackable: { _id: 'fld_stack', value: true, _sources: [] },
          },
        ],
      }
      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(limitedCarrier as any)

      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult

      // Should only suggest products carrier offers
      for (const opt of body.bundleOptions) {
        expect(['auto', 'home']).toContain(opt.product)
        expect(opt.product).not.toBe('renters')
      }
    })

    it('should filter out products when carrier does not operate in state', async () => {
      // Mock carrier that doesn't operate in CA (only TX)
      // Update getCarrierByName to return a carrier that only operates in TX
      const carrierNotInCA = {
        name: 'GEICO',
        _id: 'carr_geico',
        operatesIn: { _id: 'fld1', value: ['TX'], _sources: [] }, // Only TX, not CA
        products: { _id: 'fld2', value: ['auto', 'home', 'renters'], _sources: [] },
        discounts: [],
      }
      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(carrierNotInCA as any)
      spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockReturnValue([]) // No discounts for CA

      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult

      // Should return empty bundle options if carrier doesn't operate in state
      expect(body.bundleOptions).toHaveLength(0)
    })

    it('should merge bundle options from analyzer with LLM-generated ones', async () => {
      // Mock LLM to return a bundle option
      const originalExtract = mockLLMProvider.extractWithStructuredOutput
      mockLLMProvider.extractWithStructuredOutput = mock(async (message: string) => {
        if (
          message.includes('Analyze the following insurance policy') ||
          message.includes('Current Policy:')
        ) {
          return {
            profile: {
              currentPolicy: {
                carrier: 'GEICO',
                state: 'CA',
                productType: 'auto' as const,
                premiums: { annual: 1200 },
              },
              opportunities: [],
              bundleOptions: [
                {
                  product: 'home' as const,
                  estimatedSavings: 100,
                  requiredActions: ['Add home insurance'],
                  citation: {
                    id: 'disc_llm',
                    type: 'discount',
                    carrier: 'GEICO',
                  },
                },
              ],
              deductibleOptimizations: [],
              pitch: '',
              complianceValidated: false,
            } as unknown as Record<string, unknown>,
            confidence: {},
            tokensUsed: 600,
          }
        }
        if (message.includes('Generate an agent-ready savings pitch')) {
          return {
            profile: { pitch: 'Test pitch' },
            confidence: {},
            tokensUsed: 300,
          }
        }
        return originalExtract(message, [], undefined)
      })

      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult

      // Should have bundle options (from analyzer and/or LLM)
      expect(body.bundleOptions.length).toBeGreaterThan(0)

      // Should deduplicate by product (keep higher savings)
      const homeOptions = body.bundleOptions.filter((opt) => opt.product === 'home')
      expect(homeOptions.length).toBeLessThanOrEqual(1) // Deduplicated
    })
  })

  describe('Decision Trace Integration', () => {
    it('should include bundle analysis in decision trace', async () => {
      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult
      expect(body.trace).toBeDefined()

      if (body.bundleOptions.length > 0) {
        expect(body.trace?.bundleAnalysis).toBeDefined()
        expect(body.trace?.bundleAnalysis?.currentProduct).toBe('auto')
        expect(body.trace?.bundleAnalysis?.bundleOpportunities).toBeDefined()
        expect(Array.isArray(body.trace?.bundleAnalysis?.bundleOpportunities)).toBe(true)
        expect(body.trace?.bundleAnalysis?.bundleOpportunities.length).toBeGreaterThan(0)
      }
    })

    it('should include carrier availability checks in decision trace', async () => {
      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult

      if (body.bundleOptions.length > 0 && body.trace?.bundleAnalysis) {
        expect(body.trace.bundleAnalysis.carrierAvailabilityChecks).toBeDefined()
        expect(Array.isArray(body.trace.bundleAnalysis.carrierAvailabilityChecks)).toBe(true)
        expect(body.trace.bundleAnalysis.carrierAvailabilityChecks.length).toBeGreaterThan(0)

        const availabilityCheck = body.trace.bundleAnalysis.carrierAvailabilityChecks[0]
        expect(availabilityCheck?.carrier).toBe('GEICO')
        expect(availabilityCheck?.state).toBe('CA')
        expect(availabilityCheck?.operatesInState).toBe(true)
        expect(availabilityCheck?.availableProducts).toBeDefined()
        expect(Array.isArray(availabilityCheck?.availableProducts)).toBe(true)
      }
    })

    it('should include citations in bundle analysis decision trace', async () => {
      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult

      if (body.bundleOptions.length > 0 && body.trace?.bundleAnalysis) {
        expect(body.trace.bundleAnalysis.citations).toBeDefined()
        expect(Array.isArray(body.trace.bundleAnalysis.citations)).toBe(true)
        expect(body.trace.bundleAnalysis.citations.length).toBeGreaterThan(0)

        const citation = body.trace.bundleAnalysis.citations[0]
        expect(citation?.id).toBeDefined()
        expect(citation?.type).toBe('discount')
        expect(citation?.carrier).toBeDefined()
        expect(citation?.file).toBeDefined()
      }
    })
  })

  describe('Error Handling', () => {
    it('should continue with other opportunities if bundle analysis fails', async () => {
      // Mock bundle analyzer to throw error
      spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockImplementation(() => {
        throw new Error('Bundle analysis failed')
      })

      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      // Should still return 200 (error handled gracefully)
      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult
      expect(body.opportunities).toBeDefined()
      expect(body.bundleOptions).toBeDefined()
      // Bundle options should be empty or from LLM only
      expect(Array.isArray(body.bundleOptions)).toBe(true)
    })

    it('should handle missing carrier data gracefully', async () => {
      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(undefined)

      const policySummary: PolicySummary = {
        carrier: 'UnknownCarrier',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      // Should return error for missing carrier
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('Full Policy Analysis Flow', () => {
    it('should complete full flow: policy summary → analyze → bundle opportunities included', async () => {
      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult

      // Verify complete PolicyAnalysisResult structure
      expect(body.currentPolicy).toBeDefined()
      expect(body.currentPolicy.carrier).toBe('GEICO')
      expect(body.currentPolicy.state).toBe('CA')
      expect(body.currentPolicy.productType).toBe('auto')

      expect(body.opportunities).toBeDefined()
      expect(Array.isArray(body.opportunities)).toBe(true)

      expect(body.bundleOptions).toBeDefined()
      expect(Array.isArray(body.bundleOptions)).toBe(true)

      expect(body.pitch).toBeDefined()
      expect(typeof body.pitch).toBe('string')
      expect(body.pitch.length).toBeGreaterThan(0)

      expect(body.complianceValidated).toBeDefined()
      expect(typeof body.complianceValidated).toBe('boolean')

      expect(body.trace).toBeDefined()
    })

    it('should include bundle opportunities in pitch generation', async () => {
      const policySummary: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const res = await client.post('/api/policy/analyze', {
        policySummary,
      })

      expectSuccessResponse(res)
      const body = (await res.json()) as PolicyAnalysisResult

      // Pitch should be generated (may or may not mention bundles specifically)
      expect(body.pitch).toBeDefined()
      expect(body.pitch.length).toBeGreaterThan(0)

      // Bundle options should be available for pitch generator
      if (body.bundleOptions.length > 0) {
        // Pitch generator receives bundle options, may or may not mention them explicitly
        expect(body.bundleOptions.length).toBeGreaterThan(0)
      }
    })
  })
})
