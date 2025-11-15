/**
 * Policy Analysis Agent Service
 *
 * LLM-powered agent that analyzes policy data against knowledge pack
 * to identify savings opportunities (missing discounts, bundle options, deductible optimizations).
 *
 * Uses Gemini 2.5 Flash-Lite with structured outputs for analysis.
 *
 * @see docs/stories/2.2.policy-analysis-agent.md
 */

import type { PolicyAnalysisResult, PolicySummary } from '@repo/shared'
import { policyAnalysisResultLLMSchema } from '@repo/shared'
import { logError, logInfo } from '../utils/logger'
import * as knowledgePackRAG from './knowledge-pack-rag'
import type { LLMProvider } from './llm-provider'
import { callLLMAnalysis } from './policy-analysis-agent/llm-caller'
import { normalizePolicyAnalysisResult } from './policy-analysis-agent/normalizer'
import { buildAnalysisPrompt } from './policy-analysis-agent/prompt-builder'

/**
 * Policy Analysis Agent
 */
export class PolicyAnalysisAgent {
  // Expose intermediate outputs for testing/debugging
  public lastPrompt?: string
  public lastLLMRawOutput?: unknown
  public lastNormalizedOutput?: Omit<PolicyAnalysisResult, 'opportunities'> & {
    opportunities: import('@repo/shared').Opportunity[]
    _metadata?: { tokensUsed?: number; analysisTime?: number }
  }

  constructor(private llmProvider: LLMProvider) {}

  /**
   * Analyze policy and identify savings opportunities
   *
   * @param policySummary - Policy summary with carrier, state, product, coverage, deductibles, premiums
   * @param policyText - Optional policy text (key-value format) for additional context
   * @returns Policy analysis result with opportunities (raw from LLM, will be validated by DiscountRulesValidator)
   */
  async analyzePolicy(
    policySummary: PolicySummary,
    policyText?: string
  ): Promise<
    Omit<PolicyAnalysisResult, 'opportunities'> & {
      opportunities: import('@repo/shared').Opportunity[]
      _metadata?: { tokensUsed?: number; analysisTime?: number }
    }
  > {
    const startTime = Date.now()

    if (!policySummary.carrier || !policySummary.state || !policySummary.productType) {
      throw new Error('Policy summary must include carrier, state, and productType')
    }

    try {
      // Step 1: Query knowledge pack for context
      const carrier = knowledgePackRAG.getCarrierByName(policySummary.carrier)
      if (!carrier) {
        throw new Error(`Carrier not found in knowledge pack: ${policySummary.carrier}`)
      }

      const availableDiscounts = knowledgePackRAG.getCarrierDiscounts(
        policySummary.carrier,
        policySummary.state,
        policySummary.productType
      )

      const bundleDiscounts = knowledgePackRAG.getCarrierBundleDiscounts(
        policySummary.carrier,
        policySummary.state
      )

      const carrierProducts = knowledgePackRAG.getCarrierProducts(policySummary.carrier)

      // Step 2: Build LLM prompt with policy data + knowledge pack context
      const prompt = buildAnalysisPrompt(
        policySummary,
        policyText,
        availableDiscounts,
        bundleDiscounts,
        carrierProducts,
        carrier
      )
      this.lastPrompt = prompt // Expose for testing

      // Step 3: Call LLM with structured outputs
      // Note: We use extractWithStructuredOutput but adapt the result
      // The LLMProvider interface returns ExtractionResult, but we'll cast/adapt it
      // Use LLM schema (without file paths) - file paths will be hydrated server-side
      const llmResult = await callLLMAnalysis(this.llmProvider, prompt, policyAnalysisResultLLMSchema)
      this.lastLLMRawOutput = llmResult // Expose for testing

      const analysisTime = Date.now() - startTime

      // Step 4: Normalize and hydrate results
      // - Resolve citation file paths from knowledge pack
      // - Normalize percentage values (decimals to integers)
      // - Ensure token tracking is included
      const normalizedResult = await normalizePolicyAnalysisResult(
        {
          ...llmResult,
          _metadata: {
            tokensUsed: llmResult._metadata?.tokensUsed ?? 0,
            analysisTime,
          },
        },
        policySummary.carrier
      )
      this.lastNormalizedOutput = normalizedResult // Expose for testing

      await logInfo('Policy analysis completed', {
        carrier: policySummary.carrier,
        state: policySummary.state,
        productType: policySummary.productType,
        opportunitiesCount: normalizedResult.opportunities.length,
        bundleOptionsCount: normalizedResult.bundleOptions.length,
        deductibleOptimizationsCount: normalizedResult.deductibleOptimizations.length,
        tokensUsed: normalizedResult._metadata?.tokensUsed,
        analysisTime,
      })

      return normalizedResult
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await logError('Policy analysis failed', error as Error, {
        carrier: policySummary.carrier,
        state: policySummary.state,
        productType: policySummary.productType,
        errorMessage,
      })

      // Handle specific error types
      if (errorMessage.includes('Carrier not found')) {
        throw new Error(`KNOWLEDGE_PACK_ERROR: ${errorMessage}`)
      }

      if (errorMessage.includes('LLM') || errorMessage.includes('timeout')) {
        throw new Error(`ANALYSIS_ERROR: LLM analysis failed - ${errorMessage}`)
      }

      // Return empty result with current policy for other errors (graceful degradation)
      return {
        currentPolicy: policySummary,
        opportunities: [],
        bundleOptions: [],
        deductibleOptimizations: [],
        pitch: '',
        complianceValidated: false,
        _metadata: {
          tokensUsed: 0,
          analysisTime: Date.now() - startTime,
        },
      }
    }
  }

}
