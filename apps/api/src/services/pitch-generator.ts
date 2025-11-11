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

import type { BundleOption, DeductibleOptimization, Opportunity, PolicySummary } from '@repo/shared'
import { z } from 'zod'
import { logError, logInfo } from '../utils/logger'
import type { LLMProvider } from './llm-provider'

/**
 * Pitch generation result schema
 */
const pitchResultSchema = z.object({
  pitch: z.string(), // Agent-ready talking points with "because" rationales
})

type PitchResult = z.infer<typeof pitchResultSchema>

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
   * @param opportunities - Missing discount opportunities
   * @param bundleOptions - Bundle opportunities
   * @param deductibleOptimizations - Deductible trade-offs
   * @param policySummary - Current policy context
   * @returns Agent-ready pitch with "because" rationales
   */
  async generatePitch(
    opportunities: Opportunity[],
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
      return this.generateFallbackPitch(
        opportunities,
        bundleOptions,
        deductibleOptimizations
      ) as string & {
        _metadata?: { tokensUsed?: number }
      }
    }

    try {
      // Build prompt with all opportunities (including citations)
      const prompt = this.buildPitchPrompt(
        opportunities,
        bundleOptions,
        deductibleOptimizations,
        policySummary
      )
      this.lastPrompt = prompt // Expose for testing

      // Call LLM to generate pitch
      const result = await this.callLLMForPitch(prompt)
      this.lastLLMRawOutput = result // Expose for testing

      // Replace citation IDs in pitch with formatted citations
      const pitchWithCitations = this.replaceCitationsInPitch(
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
      return this.generateFallbackPitch(opportunities, bundleOptions, deductibleOptimizations)
    }
  }

  /**
   * Build prompt for pitch generation
   */
  private buildPitchPrompt(
    opportunities: Opportunity[],
    bundleOptions: BundleOption[],
    deductibleOptimizations: DeductibleOptimization[],
    policySummary: PolicySummary
  ): string {
    const parts: string[] = []

    parts.push(
      'Generate an agent-ready savings pitch for an insurance broker to present to a client.'
    )
    parts.push(
      'The pitch should be clear, professional, and include "because" rationales for each recommendation.'
    )
    parts.push('')

    // Policy context
    parts.push('## Current Policy:')
    parts.push(`Carrier: ${policySummary.carrier || 'Unknown'}`)
    parts.push(`State: ${policySummary.state || 'Unknown'}`)
    parts.push(`Product: ${policySummary.productType || 'Unknown'}`)
    if (policySummary.premiums?.annual) {
      parts.push(`Current Annual Premium: $${policySummary.premiums.annual}`)
    }
    parts.push('')

    // Opportunities (with citations)
    if (opportunities.length > 0) {
      parts.push('## Missing Discount Opportunities:')
      for (const opp of opportunities) {
        parts.push(
          `- ${opp.discount}: ${opp.percentage}% off, estimated $${opp.annualSavings}/yr savings`
        )
        if (opp.requires.length > 0) {
          parts.push(`  Requirements: ${opp.requires.join(', ')}`)
        }
        parts.push(
          `  Citation ID: ${opp.citation.id} (type: ${opp.citation.type}, carrier: ${opp.citation.carrier})`
        )
      }
      parts.push('')
    }

    // Bundle options (with citations)
    if (bundleOptions.length > 0) {
      parts.push('## Bundle Opportunities:')
      for (const bundle of bundleOptions) {
        parts.push(
          `- Add ${bundle.product} insurance: Estimated $${bundle.estimatedSavings}/yr savings`
        )
        if (bundle.requiredActions.length > 0) {
          parts.push(`  Actions: ${bundle.requiredActions.join(', ')}`)
        }
        parts.push(
          `  Citation ID: ${bundle.citation.id} (type: ${bundle.citation.type}, carrier: ${bundle.citation.carrier})`
        )
      }
      parts.push('')
    }

    // Deductible optimizations (with citations)
    if (deductibleOptimizations.length > 0) {
      parts.push('## Deductible Adjustments:')
      for (const opt of deductibleOptimizations) {
        parts.push(
          `- Raise deductible from $${opt.currentDeductible} to $${opt.suggestedDeductible}: $${opt.estimatedSavings}/yr savings`
        )
        parts.push(`  Premium impact: $${opt.premiumImpact}`)
        parts.push(
          `  Citation ID: ${opt.citation.id} (type: ${opt.citation.type}, carrier: ${opt.citation.carrier})`
        )
      }
      parts.push('')
    }

    // Instructions
    parts.push('## Instructions:')
    parts.push('Generate a professional, client-friendly pitch that:')
    parts.push('1. Opens with a brief summary of the analysis')
    parts.push('2. Groups recommendations by category (Discounts, Bundles, Deductible Adjustments)')
    parts.push(
      '3. For each recommendation, includes a "because" rationale explaining why it saves money'
    )
    parts.push('4. Includes specific dollar amounts and percentages')
    parts.push('5. Uses clear, actionable language suitable for a broker-client conversation')
    parts.push('6. Maintains a professional, consultative tone')
    parts.push(
      '7. When referencing citations, use the format: [citation:ID] where ID is the cuid2 citation ID'
    )
    parts.push(
      '   Example: "This discount is available [citation:disc_xrcd4bhsnd58vx2yu99ca4bn] based on your clean driving record."'
    )
    parts.push(
      '8. Do NOT include citation IDs in a way that looks technical - embed them naturally in the text'
    )
    parts.push('')
    parts.push('Return only the pitch text, no additional formatting or explanations.')

    return parts.join('\n')
  }

  /**
   * Call LLM for pitch generation
   */
  private async callLLMForPitch(
    prompt: string
  ): Promise<PitchResult & { _metadata?: { tokensUsed?: number } }> {
    try {
      // Use extractWithStructuredOutput but adapt for pitch generation
      // The LLMProvider interface returns ExtractionResult, but we'll extract the pitch
      const result = await this.llmProvider.extractWithStructuredOutput(
        prompt,
        undefined,
        pitchResultSchema
      )

      // Extract pitch from profile field (workaround for LLMProvider interface)
      const pitchData = result.profile as unknown as PitchResult

      // Validate
      const validated = pitchResultSchema.parse(pitchData)

      return {
        ...validated,
        _metadata: {
          tokensUsed: result.tokensUsed,
        },
      }
    } catch (error) {
      await logError('LLM pitch generation failed', error as Error, {
        type: 'pitch_llm_error',
      })
      throw error
    }
  }

  /**
   * Replace citation IDs in pitch with formatted citations
   *
   * LLM returns pitch with [citation:ID] markers. This function replaces them
   * with properly formatted citations that reference the knowledge pack.
   *
   * @param pitch - Pitch text from LLM with [citation:ID] markers
   * @param opportunities - Opportunities with citations
   * @param bundleOptions - Bundle options with citations
   * @param deductibleOptimizations - Deductible optimizations with citations
   * @returns Pitch with citations replaced
   */
  private replaceCitationsInPitch(
    pitch: string,
    opportunities: Opportunity[],
    bundleOptions: BundleOption[],
    deductibleOptimizations: DeductibleOptimization[]
  ): string {
    let result = pitch

    // Create a map of citation IDs to citation objects
    const citationMap = new Map<string, { type: string; carrier: string; file: string }>()

    // Add opportunities citations
    for (const opp of opportunities) {
      citationMap.set(opp.citation.id, {
        type: opp.citation.type,
        carrier: opp.citation.carrier,
        file: opp.citation.file,
      })
    }

    // Add bundle options citations
    for (const bundle of bundleOptions) {
      citationMap.set(bundle.citation.id, {
        type: bundle.citation.type,
        carrier: bundle.citation.carrier,
        file: bundle.citation.file,
      })
    }

    // Add deductible optimizations citations
    for (const opt of deductibleOptimizations) {
      citationMap.set(opt.citation.id, {
        type: opt.citation.type,
        carrier: opt.citation.carrier,
        file: opt.citation.file,
      })
    }

    // Replace [citation:ID] markers with formatted citations
    // Pattern: [citation:disc_xrcd4bhsnd58vx2yu99ca4bn]
    // Per PRD FR8: Citations should use industry-standard footnote format
    // Example: "(1) https://geico.com/discounts/, accessed 2025-11-09"
    // For now, we'll remove the markers since citations are tracked server-side in decision trace
    // The frontend can add footnotes based on the citation data if needed
    const citationPattern = /\[citation:([a-z0-9_]+)\]/g
    result = result.replace(citationPattern, (match, citationId) => {
      const citation = citationMap.get(citationId)
      if (citation) {
        // Remove citation markers from client-facing text
        // Citations are preserved in the decision trace for audit purposes
        // Frontend can add footnotes if needed based on citation.file
        return ''
      }
      return match // Keep original if citation not found
    })

    return result
  }

  /**
   * Generate fallback pitch if LLM fails
   */
  private generateFallbackPitch(
    opportunities: Opportunity[],
    bundleOptions: BundleOption[],
    deductibleOptimizations: DeductibleOptimization[]
  ): string {
    const parts: string[] = []

    if (
      opportunities.length === 0 &&
      bundleOptions.length === 0 &&
      deductibleOptimizations.length === 0
    ) {
      return 'Based on our analysis, your current policy appears well-optimized. We recommend reviewing your coverage annually to ensure you continue to receive the best value.'
    }

    parts.push(
      "Based on our analysis of your current policy, we've identified the following savings opportunities:"
    )
    parts.push('')

    if (opportunities.length > 0) {
      parts.push('**Discount Opportunities:**')
      for (const opp of opportunities.slice(0, 5)) {
        parts.push(
          `- ${opp.discount}: ${opp.percentage}% off, saving approximately $${opp.annualSavings} per year because you qualify for this discount based on your policy details.`
        )
      }
      parts.push('')
    }

    if (bundleOptions.length > 0) {
      parts.push('**Bundle Opportunities:**')
      for (const bundle of bundleOptions.slice(0, 3)) {
        parts.push(
          `- Add ${bundle.product} insurance: Estimated savings of $${bundle.estimatedSavings} per year because bundling multiple policies typically qualifies for additional discounts.`
        )
      }
      parts.push('')
    }

    if (deductibleOptimizations.length > 0) {
      parts.push('**Deductible Adjustments:**')
      for (const opt of deductibleOptimizations.slice(0, 3)) {
        parts.push(
          `- Consider raising your deductible from $${opt.currentDeductible} to $${opt.suggestedDeductible}: This could save approximately $${opt.estimatedSavings} per year because higher deductibles typically result in lower premiums.`
        )
      }
    }

    return parts.join('\n')
  }
}
