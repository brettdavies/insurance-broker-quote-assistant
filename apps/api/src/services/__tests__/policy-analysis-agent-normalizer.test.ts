/**
 * Policy Analysis Agent Normalizer Tests
 *
 * Tests validation and normalization of PolicyAnalysisResult from LLM:
 * - Citation file path resolution from knowledge pack
 * - Percentage normalization (decimals to integers)
 * - Token tracking inclusion
 */

import { beforeEach, describe, expect, it, spyOn } from 'bun:test'
import {
  buildBundleOption,
  buildDeductibleOptimization,
  buildOpportunity,
  buildPolicySummary,
} from '@repo/shared'
import * as knowledgePackRAG from '../knowledge-pack-rag'
import { normalizePolicyAnalysisResult } from '../policy-analysis-agent/normalizer'
import type { NormalizerInput } from '../policy-analysis-agent/types'

describe('normalizePolicyAnalysisResult', () => {
  beforeEach(() => {
    // Mock knowledge pack RAG
    const testCarrier = {
      name: 'GEICO',
      _id: 'carr_test',
      _sources: [
        {
          pageFile: 'knowledge_pack/carriers/geico.json',
          pageUrl: 'https://example.com/geico',
        },
      ],
      operatesIn: { _id: 'fld1', value: ['CA'], _sources: [] },
      products: { _id: 'fld2', value: ['auto', 'home'], _sources: [] },
      discounts: [
        {
          _id: 'disc_test',
          name: { _id: 'fld3', value: 'Test Discount', _sources: [] },
          percentage: { _id: 'fld4', value: 10, _sources: [] },
          products: { _id: 'fld5', value: ['auto'], _sources: [] },
          states: { _id: 'fld6', value: ['CA'], _sources: [] },
          requirements: { _id: 'fld7', value: {}, _sources: [] },
          _sources: [
            {
              pageFile: 'knowledge_pack/carriers/geico-discounts.json',
              pageUrl: 'https://example.com/geico/discounts',
            },
          ],
        },
      ],
    }

    spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(testCarrier as any)
  })

  it('should normalize percentage from decimal to integer', async () => {
    // Normalizer accepts Opportunity[], not ValidatedOpportunity[]
    const llmResult: NormalizerInput = {
      currentPolicy: buildPolicySummary(),
      opportunities: [
        buildOpportunity({
          discount: 'Test Discount',
          percentage: 0.1, // Decimal (should be normalized to 10)
          annualSavings: 120,
          citation: {
            id: 'disc_test',
            type: 'discount',
            carrier: 'GEICO',
            file: '', // Will be resolved by normalizer
          },
        }),
      ],
      bundleOptions: [],
      deductibleOptimizations: [],
      pitch: '',
      complianceValidated: false,
      _metadata: {
        tokensUsed: 500,
      },
    }

    const normalized = await normalizePolicyAnalysisResult(llmResult, 'GEICO')

    expect(normalized.opportunities[0]?.percentage).toBe(10) // Normalized from 0.1
  })

  it('should resolve citation file paths from knowledge pack', async () => {
    const result: NormalizerInput = {
      currentPolicy: buildPolicySummary(),
      opportunities: [
        buildOpportunity({
          discount: 'Test Discount',
          percentage: 10,
          annualSavings: 120,
          citation: {
            id: 'disc_test',
            type: 'discount',
            carrier: 'GEICO',
            file: '', // Empty - should be resolved
          },
        }),
      ],
      bundleOptions: [],
      deductibleOptimizations: [],
      pitch: '',
      complianceValidated: false,
      _metadata: {
        tokensUsed: 500,
      },
    }

    const normalized = await normalizePolicyAnalysisResult(result, 'GEICO')

    // Citation file resolution uses fallback path if discount source not found
    // The actual path depends on the knowledge pack structure
    expect(normalized.opportunities[0]?.citation.file).toBeDefined()
    expect(typeof normalized.opportunities[0]?.citation.file).toBe('string')
    expect(normalized.opportunities[0]?.citation.file).toContain('knowledge_pack')
  })

  it('should preserve token tracking in metadata', async () => {
    const result: NormalizerInput = {
      currentPolicy: buildPolicySummary(),
      opportunities: [],
      bundleOptions: [],
      deductibleOptimizations: [],
      pitch: '',
      complianceValidated: false,
      _metadata: {
        tokensUsed: 750,
        analysisTime: 2000,
      },
    }

    const normalized = await normalizePolicyAnalysisResult(result, 'GEICO')

    expect(normalized._metadata?.tokensUsed).toBe(750)
    expect(normalized._metadata?.analysisTime).toBe(2000)
  })

  it('should handle missing token tracking gracefully', async () => {
    const result: NormalizerInput = {
      currentPolicy: buildPolicySummary(),
      opportunities: [],
      bundleOptions: [],
      deductibleOptimizations: [],
      pitch: '',
      complianceValidated: false,
    }

    const normalized = await normalizePolicyAnalysisResult(result, 'GEICO')

    expect(normalized._metadata?.tokensUsed).toBe(0)
    expect(normalized._metadata?.analysisTime).toBe(0)
  })

  it('should normalize all opportunity types', async () => {
    const result: NormalizerInput = {
      currentPolicy: buildPolicySummary(),
      opportunities: [
        buildOpportunity({
          discount: 'Discount 1',
          percentage: 0.15, // Decimal
          annualSavings: 180,
          citation: {
            id: 'disc_test',
            type: 'discount',
            carrier: 'GEICO',
            file: '',
          },
        }),
      ],
      bundleOptions: [
        buildBundleOption({
          product: 'home',
          estimatedSavings: 200,
          citation: {
            id: 'disc_test',
            type: 'discount',
            carrier: 'GEICO',
            file: '',
          },
        }),
      ],
      deductibleOptimizations: [
        buildDeductibleOptimization({
          currentDeductible: 500,
          suggestedDeductible: 1000,
          estimatedSavings: 150,
          premiumImpact: -150,
          citation: {
            id: 'disc_test',
            type: 'discount',
            carrier: 'GEICO',
            file: '',
          },
        }),
      ],
      pitch: '',
      complianceValidated: false,
      _metadata: {
        tokensUsed: 600,
      },
    }

    const normalized = await normalizePolicyAnalysisResult(result, 'GEICO')

    expect(normalized.opportunities[0]?.percentage).toBe(15) // Normalized
    expect(normalized.opportunities[0]?.citation.file).toBeTruthy()
    expect(normalized.bundleOptions[0]?.citation.file).toBeTruthy()
    expect(normalized.deductibleOptimizations[0]?.citation.file).toBeTruthy()
  })

  it('should use fallback path if carrier not found', async () => {
    spyOn(knowledgePackRAG, 'getCarrierByName').mockReturnValue(undefined)

    const result: NormalizerInput = {
      currentPolicy: buildPolicySummary({
        carrier: 'UnknownCarrier',
      }),
      opportunities: [
        buildOpportunity({
          discount: 'Test Discount',
          percentage: 10,
          annualSavings: 120,
          citation: {
            id: 'disc_test',
            type: 'discount',
            carrier: 'UnknownCarrier',
            file: '',
          },
        }),
      ],
      bundleOptions: [],
      deductibleOptimizations: [],
      pitch: '',
      complianceValidated: false,
      _metadata: {
        tokensUsed: 500,
      },
    }

    const normalized = await normalizePolicyAnalysisResult(result, 'UnknownCarrier')

    expect(normalized.opportunities[0]?.citation.file).toBe(
      'knowledge_pack/carriers/unknowncarrier.json'
    )
  })
})
