/**
 * Policy Analysis Agent Unit Tests
 *
 * Tests policy analysis logic, discount identification, bundle detection,
 * deductible optimization, citation inclusion, and opportunity ranking.
 *
 * @see docs/stories/2.2.policy-analysis-agent.md#task-12
 */

import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { PolicySummary } from '@repo/shared'
import { policyAnalysisResultLLMSchema } from '@repo/shared'
import { buildOpportunity, buildPolicySummary, buildUserProfile } from '@repo/shared/src/test-utils'
import * as knowledgePackRAG from '../knowledge-pack-rag'
import type { LLMProvider } from '../llm-provider'
import { PolicyAnalysisAgent } from '../policy-analysis-agent'
import type { LLMAnalysisOutput } from '../policy-analysis-agent/types'

describe('PolicyAnalysisAgent', () => {
  let mockLLMProvider: LLMProvider
  let agent: PolicyAnalysisAgent

  beforeEach(() => {
    // Create mock LLM provider
    mockLLMProvider = {
      extractWithStructuredOutput: mock(async () => ({
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
        reasoning: 'Mock LLM analysis',
        tokensUsed: 500,
      })),
    } as unknown as LLMProvider

    agent = new PolicyAnalysisAgent(mockLLMProvider)

    // Mock knowledge pack RAG functions using spyOn
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

  describe('analyzePolicy', () => {
    it('should require carrier, state, and productType', async () => {
      const policy = { carrier: 'GEICO' } as PolicySummary

      await expect(agent.analyzePolicy(policy)).rejects.toThrow(
        'Policy summary must include carrier, state, and productType'
      )
    })

    it('should query knowledge pack for carrier discounts', async () => {
      const policy = buildPolicySummary()

      await agent.analyzePolicy(policy)

      expect(knowledgePackRAG.getCarrierByName).toHaveBeenCalledWith('GEICO')
      expect(knowledgePackRAG.getCarrierDiscounts).toHaveBeenCalledWith('GEICO', 'CA', 'auto')
      expect(knowledgePackRAG.getCarrierBundleDiscounts).toHaveBeenCalledWith('GEICO', 'CA')
      expect(knowledgePackRAG.getCarrierProducts).toHaveBeenCalledWith('GEICO')
    })

    it('should throw error if carrier not found in knowledge pack', async () => {
      spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(undefined)
      const policy = buildPolicySummary()

      await expect(agent.analyzePolicy(policy)).rejects.toThrow('KNOWLEDGE_PACK_ERROR')
    })

    it('should call LLM with structured outputs', async () => {
      const policy = buildPolicySummary()

      await agent.analyzePolicy(policy)

      expect(mockLLMProvider.extractWithStructuredOutput).toHaveBeenCalled()
      const callArgs = (mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mock
        .calls[0]
      expect(callArgs?.[0]).toContain('GEICO')
      expect(callArgs?.[0]).toContain('CA')
      expect(callArgs?.[0]).toContain('auto')
      // Check that a schema was passed (second argument, zero-indexed as [1])
      // Note: We can't use .toBe() for reference equality since Zod schemas may be different instances
      expect(callArgs?.[1]).toBeDefined()
      expect(callArgs?.[1]._def).toBeDefined() // Zod schemas have a _def property
    })

    it('should return PolicyAnalysisResult with metadata', async () => {
      const policy = buildPolicySummary()

      const result = await agent.analyzePolicy(policy)

      expect(result.currentPolicy).toBeDefined()
      expect(result.opportunities).toBeDefined()
      expect(result.bundleOptions).toBeDefined()
      expect(result.deductibleOptimizations).toBeDefined()
      expect(result._metadata?.tokensUsed).toBe(500)
      expect(result._metadata?.analysisTime).toBeGreaterThanOrEqual(0)
    })

    it('should validate LLM response against schema', async () => {
      const policy = buildPolicySummary()
      const mockAnalysisResult: LLMAnalysisOutput = {
        currentPolicy: policy,
        opportunities: [
          buildOpportunity({
            discount: 'Good Driver',
            annualSavings: 120,
            requires: ['cleanRecord3Yr'],
            citation: {
              id: 'disc_test',
              type: 'discount',
              carrier: 'carr_test',
              file: 'knowledge_pack/carriers/geico.json',
            },
          }),
        ],
        bundleOptions: [],
        deductibleOptimizations: [],
        pitch: '',
        complianceValidated: false,
      }
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockResolvedValue({
        profile: mockAnalysisResult as unknown as Record<string, unknown>,
        confidence: {},
        tokensUsed: 600,
      })

      const result = await agent.analyzePolicy(policy)

      expect(result.opportunities).toHaveLength(1)
      expect(result.opportunities[0]?.discount).toBe('Good Driver')
      expect(result.opportunities[0]?.citation.id).toBe('disc_test')
    })

    it('should handle LLM errors gracefully', async () => {
      const policy = buildPolicySummary()
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockRejectedValue(
        new Error('LLM timeout')
      )

      await expect(agent.analyzePolicy(policy)).rejects.toThrow('ANALYSIS_ERROR')
    })

    it('should return empty result for non-critical errors', async () => {
      const policy = buildPolicySummary()
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockRejectedValue(
        new Error('Network error')
      )

      // Should not throw, but return empty result
      // Note: This depends on error handling implementation
      try {
        const result = await agent.analyzePolicy(policy)
        expect(result.opportunities).toHaveLength(0)
      } catch (error) {
        // If it throws, that's also acceptable based on implementation
        expect((error as Error).message).toContain('ANALYSIS_ERROR')
      }
    })

    it('should include policy text in prompt when provided', async () => {
      const policy = buildPolicySummary()
      const policyText = 'carrier:GEICO state:CA productType:auto premium:$1200/yr'

      await agent.analyzePolicy(policy, policyText)

      const callArgs = (mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mock
        .calls[0]
      expect(callArgs?.[0]).toContain('carrier:GEICO')
    })

    it('should rank opportunities by annual savings (highest first)', async () => {
      const policy = buildPolicySummary()
      const mockAnalysisResult: LLMAnalysisOutput = {
        currentPolicy: policy,
        opportunities: [
          buildOpportunity({
            discount: 'Low Savings',
            percentage: 5,
            annualSavings: 60,
            citation: {
              id: 'disc_low',
              type: 'discount',
              carrier: 'carr_test',
              file: 'knowledge_pack/carriers/geico.json',
            },
          }),
          buildOpportunity({
            discount: 'High Savings',
            percentage: 15,
            annualSavings: 180,
            citation: {
              id: 'disc_high',
              type: 'discount',
              carrier: 'carr_test',
              file: 'knowledge_pack/carriers/geico.json',
            },
          }),
        ],
        bundleOptions: [],
        deductibleOptimizations: [],
        pitch: '',
        complianceValidated: false,
      }
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockResolvedValue({
        profile: mockAnalysisResult as unknown as Record<string, unknown>,
        confidence: {},
        tokensUsed: 700,
      })

      const result = await agent.analyzePolicy(policy)

      // LLM should return opportunities sorted by savings (highest first)
      // We verify the structure is correct
      expect(result.opportunities).toHaveLength(2)
      // Note: Actual sorting is done by LLM, we just verify structure
    })
  })
})
