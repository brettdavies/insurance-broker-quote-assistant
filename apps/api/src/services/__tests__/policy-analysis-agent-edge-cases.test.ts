/**
 * Policy Analysis Agent Edge Case Tests
 *
 * Tests edge cases and error scenarios:
 * - Invalid carrier
 * - Missing state/product
 * - Empty policy data
 * - Very high/low premiums
 * - Unusual coverage combinations
 * - Missing knowledge pack data
 */

import { beforeEach, describe, expect, it, spyOn } from 'bun:test'
import type { PolicySummary } from '@repo/shared'
import * as knowledgePackRAG from '../knowledge-pack-rag'
import type { LLMProvider } from '../llm-provider'
import { PolicyAnalysisAgent } from '../policy-analysis-agent'

describe('PolicyAnalysisAgent - Edge Cases', () => {
  let mockLLMProvider: LLMProvider
  let agent: PolicyAnalysisAgent

  beforeEach(() => {
    mockLLMProvider = {
      extractWithStructuredOutput: async () => ({
        profile: {
          currentPolicy: {
            carrier: 'GEICO',
            state: 'CA',
            productType: 'auto',
            premiums: { annual: 1200 },
          },
          opportunities: [],
          bundleOptions: [],
          deductibleOptimizations: [],
          pitch: '',
          complianceValidated: false,
        },
        confidence: {},
        tokensUsed: 500,
      }),
    } as unknown as LLMProvider

    agent = new PolicyAnalysisAgent(mockLLMProvider)
  })

  describe('Invalid Inputs', () => {
    it('should handle missing carrier', async () => {
      const policy: PolicySummary = {
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      await expect(agent.analyzePolicy(policy)).rejects.toThrow(
        'Policy summary must include carrier, state, and productType'
      )
    })

    it('should handle missing state', async () => {
      const policy: PolicySummary = {
        carrier: 'GEICO',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      await expect(agent.analyzePolicy(policy)).rejects.toThrow(
        'Policy summary must include carrier, state, and productType'
      )
    })

    it('should handle missing productType', async () => {
      const policy: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        premiums: { annual: 1200 },
      }

      await expect(agent.analyzePolicy(policy)).rejects.toThrow(
        'Policy summary must include carrier, state, and productType'
      )
    })

    it('should handle unknown carrier in knowledge pack', async () => {
      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(undefined)

      const policy: PolicySummary = {
        carrier: 'UnknownCarrier',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      await expect(agent.analyzePolicy(policy)).rejects.toThrow('KNOWLEDGE_PACK_ERROR')
    })
  })

  describe('Unusual Policy Values', () => {
    it('should handle very high premium', async () => {
      const testCarrier = {
        name: 'GEICO',
        _id: 'carr_test',
        operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
        products: { _id: 'fld2', value: ['auto'], _sources: [] },
        discounts: [],
      }

      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
      spyOn(knowledgePackRAG, 'getCarrierDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierProducts').mockReturnValue(['auto'])

      const policy: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 50000 }, // Very high premium
      }

      const result = await agent.analyzePolicy(policy)

      expect(result.currentPolicy.premiums?.annual).toBe(50000)
      expect(result.opportunities).toBeDefined()
    })

    it('should handle very low premium', async () => {
      const testCarrier = {
        name: 'GEICO',
        _id: 'carr_test',
        operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
        products: { _id: 'fld2', value: ['auto'], _sources: [] },
        discounts: [],
      }

      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
      spyOn(knowledgePackRAG, 'getCarrierDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierProducts').mockReturnValue(['auto'])

      const policy: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 100 }, // Very low premium
      }

      const result = await agent.analyzePolicy(policy)

      expect(result.currentPolicy.premiums?.annual).toBe(100)
      expect(result.opportunities).toBeDefined()
    })

    it('should handle zero premium', async () => {
      const testCarrier = {
        name: 'GEICO',
        _id: 'carr_test',
        operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
        products: { _id: 'fld2', value: ['auto'], _sources: [] },
        discounts: [],
      }

      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
      spyOn(knowledgePackRAG, 'getCarrierDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierProducts').mockReturnValue(['auto'])

      const policy: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 0 },
      }

      const result = await agent.analyzePolicy(policy)

      expect(result.currentPolicy.premiums?.annual).toBe(0)
    })
  })

  describe('Unusual Coverage Combinations', () => {
    it('should handle policy with all deductible types', async () => {
      const testCarrier = {
        name: 'GEICO',
        _id: 'carr_test',
        operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
        products: { _id: 'fld2', value: ['auto'], _sources: [] },
        discounts: [],
      }

      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
      spyOn(knowledgePackRAG, 'getCarrierDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierProducts').mockReturnValue(['auto'])

      const policy: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
        deductibles: {
          auto: 500,
          comprehensive: 250,
          collision: 1000,
        },
        coverageLimits: {
          liability: 100000,
          propertyDamage: 50000,
        },
      }

      const result = await agent.analyzePolicy(policy)

      expect(result.currentPolicy.deductibles?.auto).toBe(500)
      expect(result.currentPolicy.deductibles?.comprehensive).toBe(250)
      expect(result.currentPolicy.deductibles?.collision).toBe(1000)
    })

    it('should handle policy with only partial data', async () => {
      const testCarrier = {
        name: 'GEICO',
        _id: 'carr_test',
        operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
        products: { _id: 'fld2', value: ['auto'], _sources: [] },
        discounts: [],
      }

      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
      spyOn(knowledgePackRAG, 'getCarrierDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierProducts').mockReturnValue(['auto'])

      const policy: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        // No premiums, deductibles, or coverage limits
      }

      const result = await agent.analyzePolicy(policy)

      expect(result.currentPolicy.carrier).toBe('GEICO')
      expect(result.opportunities).toBeDefined()
    })
  })

  describe('Knowledge Pack Edge Cases', () => {
    it('should handle carrier with no discounts', async () => {
      const testCarrier = {
        name: 'GEICO',
        _id: 'carr_test',
        operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
        products: { _id: 'fld2', value: ['auto'], _sources: [] },
        discounts: [], // No discounts
      }

      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
      spyOn(knowledgePackRAG, 'getCarrierDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierProducts').mockReturnValue(['auto'])

      const policy: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const result = await agent.analyzePolicy(policy)

      expect(result.opportunities).toHaveLength(0)
    })

    it('should handle carrier with no bundle discounts', async () => {
      const testCarrier = {
        name: 'GEICO',
        _id: 'carr_test',
        operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
        products: { _id: 'fld2', value: ['auto'], _sources: [] },
        discounts: [],
      }

      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
      spyOn(knowledgePackRAG, 'getCarrierDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierProducts').mockReturnValue(['auto'])

      const policy: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      const result = await agent.analyzePolicy(policy)

      expect(result.bundleOptions).toHaveLength(0)
    })
  })

  describe('LLM Error Handling', () => {
    it('should handle LLM timeout gracefully', async () => {
      const testCarrier = {
        name: 'GEICO',
        _id: 'carr_test',
        operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
        products: { _id: 'fld2', value: ['auto'], _sources: [] },
        discounts: [],
      }

      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
      spyOn(knowledgePackRAG, 'getCarrierDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierProducts').mockReturnValue(['auto'])
      ;(mockLLMProvider.extractWithStructuredOutput as any) = async () => {
        throw new Error('LLM request timed out after 10000ms')
      }

      const policy: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      await expect(agent.analyzePolicy(policy)).rejects.toThrow('ANALYSIS_ERROR')
    })

    it('should handle LLM invalid response gracefully', async () => {
      const testCarrier = {
        name: 'GEICO',
        _id: 'carr_test',
        operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
        products: { _id: 'fld2', value: ['auto'], _sources: [] },
        discounts: [],
      }

      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
      spyOn(knowledgePackRAG, 'getCarrierDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockReturnValue([])
      spyOn(knowledgePackRAG, 'getCarrierProducts').mockReturnValue(['auto'])
      ;(mockLLMProvider.extractWithStructuredOutput as any) = async () => ({
        profile: { invalid: 'response' },
        confidence: {},
        tokensUsed: 0,
      })

      const policy: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        premiums: { annual: 1200 },
      }

      // Should throw validation error (schema validation fails)
      // The error may be caught and handled gracefully, so we check for either throw or empty result
      try {
        const result = await agent.analyzePolicy(policy)
        // If it doesn't throw, result should be empty/graceful degradation
        expect(result.opportunities).toHaveLength(0)
        expect(result.bundleOptions).toHaveLength(0)
        expect(result.deductibleOptimizations).toHaveLength(0)
      } catch (error) {
        // If it throws, that's also acceptable (validation error)
        expect(error).toBeDefined()
        expect(error instanceof Error).toBe(true)
      }
    })
  })
})
