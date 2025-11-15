/**
 * Pitch Generator Agent Service
 *
 * LLM-powered agent that generates agent-ready talking points from savings opportunities.
 * Transforms structured opportunity data into human-friendly savings recommendations with "because" rationales.
 *
 * Uses Gemini 2.5 Flash-Lite with structured outputs for pitch generation.
 * Note: Architecture docs suggest GPT-4o for higher quality, but using Gemini for consistency with Epic 2.
 *
 * @see docs/architecture/6-components.md#62-pitch-generator-agent-llm
 */

import type {
  BundleOption,
  DeductibleOptimization,
  Opportunity,
  PolicySummary,
  ValidatedOpportunity,
} from '@repo/shared'
import { logError, logInfo } from '../utils/logger'
import { callLLMForPitch } from './pitch-generator/llm-caller'
import { buildPitchPrompt } from './pitch-generator/prompt-builder'
import { replaceCitationsInPitch } from './pitch-generator/citation-replacer'
import { generateFallbackPitch } from './pitch-generator/fallback-generator'
import type { LLMProvider } from './llm-provider'

/**
 * Pitch Generator Agent
 */
export class PitchGenerator {
  // Expose intermediate outputs for testing/debugging
  public lastPrompt?: string
  public lastLLMRawOutput?: unknown
  public lastPitchWithCitations?: string

  constructor(private llmProvider: LLMProvider) {}

  /**
   * Generate savings pitch from opportunities
   *
   * @param opportunities - Missing discount opportunities (can be Opportunity or ValidatedOpportunity)
   * @param bundleOptions - Bundle opportunities
   * @param deductibleOptimizations - Deductible trade-offs
   * @param policySummary - Current policy context
   * @returns Agent-ready pitch with "because" rationales
   */
  async generatePitch(
    opportunities: (Opportunity | ValidatedOpportunity)[],
    bundleOptions: BundleOption[],
    deductibleOptimizations: DeductibleOptimization[],
    policySummary: PolicySummary
  ): Promise<string & { _metadata?: { tokensUsed?: number } }> {
    // Server-side detection: If no opportunities, don't call LLM
    if (
      opportunities.length === 0 &&
      bundleOptions.length === 0 &&
      deductibleOptimizations.length === 0
    ) {
      return generateFallbackPitch(
        opportunities,
        bundleOptions,
        deductibleOptimizations
      ) as string & {
        _metadata?: { tokensUsed?: number }
      }
    }

    try {
      // Build prompt with all opportunities (including citations)
      const prompt = buildPitchPrompt(
        opportunities,
        bundleOptions,
        deductibleOptimizations,
        policySummary
      )
      this.lastPrompt = prompt // Expose for testing

      // Call LLM to generate pitch
      const result = await callLLMForPitch(this.llmProvider, prompt)
      this.lastLLMRawOutput = result // Expose for testing

      // Replace citation IDs in pitch with formatted citations
      const pitchWithCitations = replaceCitationsInPitch(
        result.pitch,
        opportunities,
        bundleOptions,
        deductibleOptimizations
      )
      this.lastPitchWithCitations = pitchWithCitations // Expose for testing

      await logInfo('Pitch generation completed', {
        carrier: policySummary.carrier,
        state: policySummary.state,
        opportunitiesCount: opportunities.length,
        bundleOptionsCount: bundleOptions.length,
        deductibleOptimizationsCount: deductibleOptimizations.length,
        pitchLength: pitchWithCitations.length,
        tokensUsed: result._metadata?.tokensUsed,
      })

      return pitchWithCitations as string & { _metadata?: { tokensUsed?: number } }
    } catch (error) {
      await logError('Pitch generation failed', error as Error, {
        type: 'pitch_generation_error',
        carrier: policySummary.carrier,
        state: policySummary.state,
      })

      // Return fallback pitch
      return generateFallbackPitch(opportunities, bundleOptions, deductibleOptimizations)
    }
  }

}
