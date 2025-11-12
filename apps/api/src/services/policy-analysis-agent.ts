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
import type { ZodSchema } from 'zod'
import type { z } from 'zod'
import { getFieldValue } from '../utils/field-helpers'
import { logError, logInfo } from '../utils/logger'
import * as knowledgePackRAG from './knowledge-pack-rag'
import type { LLMProvider } from './llm-provider'
import { normalizePolicyAnalysisResult } from './policy-analysis-agent/normalizer'

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
      const prompt = this.buildAnalysisPrompt(
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
      const llmResult = await this.callLLMAnalysis(prompt, policyAnalysisResultLLMSchema)
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

  /**
   * Build analysis prompt with policy data and knowledge pack context
   */
  private buildAnalysisPrompt(
    policySummary: PolicySummary,
    policyText: string | undefined,
    availableDiscounts: import('@repo/shared').Carrier['discounts'],
    bundleDiscounts: import('@repo/shared').Carrier['discounts'],
    carrierProducts: string[],
    carrier: import('@repo/shared').Carrier
  ): string {
    const parts: string[] = []

    parts.push('Analyze the following insurance policy and identify savings opportunities.')
    parts.push('')

    // Policy context
    parts.push('## Current Policy:')
    if (policyText) {
      parts.push(`Policy Text: ${policyText}`)
    }
    parts.push(`Carrier: ${policySummary.carrier}`)
    parts.push(`State: ${policySummary.state}`)
    parts.push(`Product Type: ${policySummary.productType}`)

    if (policySummary.premiums?.annual) {
      parts.push(`Annual Premium: $${policySummary.premiums.annual}`)
    }

    // Extract deductibles from policySummary or parse from policyText
    let deductiblesToShow: {
      auto?: number
      home?: number
      comprehensive?: number
      collision?: number
    } = {}

    if (policySummary.deductibles) {
      deductiblesToShow = policySummary.deductibles
    } else if (policyText) {
      // Try to parse deductibles from policyText (key-value format)
      // Format: "deductible:$500" or "deductible:auto:$500" or "deductible:500"
      // Regex: matches "deductible" optionally followed by ":type" then ":$value" or ":value"
      const deductibleMatch = policyText.match(
        /deductible(?::(auto|home|comprehensive|collision))?:[\$]?(\d+)/i
      )
      if (deductibleMatch?.[2]) {
        const deductibleValue = Number.parseInt(deductibleMatch[2], 10)
        const deductibleType = deductibleMatch[1]?.toLowerCase() || 'auto'
        if (deductibleType === 'auto' || !deductibleMatch[1]) {
          deductiblesToShow.auto = deductibleValue
        } else if (deductibleType === 'home') {
          deductiblesToShow.home = deductibleValue
        } else if (deductibleType === 'comprehensive') {
          deductiblesToShow.comprehensive = deductibleValue
        } else if (deductibleType === 'collision') {
          deductiblesToShow.collision = deductibleValue
        }
      }
    }

    if (Object.keys(deductiblesToShow).length > 0) {
      if (deductiblesToShow.auto !== undefined)
        parts.push(`Auto Deductible: $${deductiblesToShow.auto}`)
      if (deductiblesToShow.home !== undefined)
        parts.push(`Home Deductible: $${deductiblesToShow.home}`)
      if (deductiblesToShow.comprehensive !== undefined)
        parts.push(`Comprehensive Deductible: $${deductiblesToShow.comprehensive}`)
      if (deductiblesToShow.collision !== undefined)
        parts.push(`Collision Deductible: $${deductiblesToShow.collision}`)
    }

    if (policySummary.coverageLimits) {
      parts.push('Coverage Limits:')
      const limits = policySummary.coverageLimits
      if (limits.liability) parts.push(`  Liability: $${limits.liability}`)
      if (limits.propertyDamage) parts.push(`  Property Damage: $${limits.propertyDamage}`)
      if (limits.dwelling) parts.push(`  Dwelling: $${limits.dwelling}`)
    }

    parts.push('')

    // Knowledge pack context
    parts.push('## Available Discounts:')
    if (availableDiscounts.length === 0) {
      parts.push('No discounts available for this carrier/state/product combination.')
    } else {
      for (const discount of availableDiscounts.slice(0, 10)) {
        // Limit to 10 discounts to avoid prompt bloat
        const name = getFieldValue(discount.name, 'Unknown Discount')
        const percentage = getFieldValue(discount.percentage, 0)
        const requirements = getFieldValue(discount.requirements, {})
        const reqsText =
          typeof requirements === 'object' && requirements !== null
            ? JSON.stringify(requirements)
            : String(requirements)

        parts.push(
          `- ${name} (${percentage}% off) - Requirements: ${reqsText} - ID: ${discount._id}`
        )
      }
    }

    parts.push('')

    parts.push('## Bundle Discounts:')
    if (bundleDiscounts.length === 0) {
      parts.push('No bundle discounts available.')
    } else {
      for (const discount of bundleDiscounts.slice(0, 5)) {
        // Limit to 5 bundle discounts
        const name = getFieldValue(discount.name, 'Unknown Bundle Discount')
        const percentage = getFieldValue(discount.percentage, 0)
        const requirements = getFieldValue(discount.requirements, {}) as {
          bundleProducts?: string[]
        }
        const bundleProducts = requirements.bundleProducts || []

        parts.push(
          `- ${name} (${percentage}% off) - Requires: ${bundleProducts.join(' + ')} - ID: ${discount._id}`
        )
      }
    }

    parts.push('')

    parts.push('## Carrier Products:')
    parts.push(`Available products: ${carrierProducts.join(', ')}`)

    parts.push('')

    // Instructions
    parts.push('## Analysis Instructions:')
    parts.push(
      'Analyze the policy and return a structured JSON response with the following analysis:'
    )
    parts.push('')
    parts.push('1. **Missing Discounts (opportunities array):**')
    parts.push('   - Compare current policy against available discounts listed above')
    parts.push('   - Identify discounts the policyholder qualifies for but may not be receiving')
    parts.push(
      '   - For each opportunity, include: discount name, percentage, estimated annual savings in dollars, requirements array, and citation object with cuid2 ID (use discount._id from above)'
    )
    parts.push('')
    parts.push('2. **Bundle Opportunities (bundleOptions array):**')
    parts.push(
      '   - If policy has only one product (auto OR home, not both), suggest adding the missing product for bundle savings'
    )
    parts.push('   - Check bundle discounts listed above to find applicable bundle rules')
    parts.push(
      '   - For each bundle option, include: product to add, estimated savings, required actions array, and citation with discount cuid2 ID'
    )
    parts.push('')
    parts.push('3. **Deductible Optimizations (deductibleOptimizations array):**')
    parts.push(
      '   - **IMPORTANT:** Analyze the current deductibles shown above (or mentioned in Policy Text)'
    )
    parts.push(
      '   - Suggest deductible adjustments that could save money (e.g., raising auto deductible $500→$1000 typically saves $150-200/yr)'
    )
    parts.push(
      '   - Calculate estimated annual savings based on typical premium reductions (higher deductible = lower premium)'
    )
    parts.push(
      '   - Premium impact should be negative (savings) for raising deductibles, positive (cost) for lowering deductibles'
    )
    parts.push(
      '   - If deductibles are shown above, you MUST analyze them and suggest optimizations'
    )
    parts.push(
      '   - Include citation with cuid2 ID for any pricing data used (use discount IDs from knowledge pack)'
    )
    parts.push('')
    parts.push(
      '4. **Ranking:** Sort all opportunities by estimated annual savings impact (highest first)'
    )
    parts.push('')
    parts.push(
      '5. **Citations:** Only include opportunities with valid citations from the knowledge pack (use the discount IDs provided above)'
    )
    parts.push('')
    parts.push('6. **Response Format:** Return a complete PolicyAnalysisResult object with:')
    parts.push('   - currentPolicy: The policy summary provided')
    parts.push('   - opportunities: Array of missing discount opportunities')
    parts.push('   - bundleOptions: Array of bundle opportunities')
    parts.push('   - deductibleOptimizations: Array of deductible trade-offs')
    parts.push('   - pitch: Empty string (will be generated separately)')
    parts.push('   - complianceValidated: false (will be validated separately)')

    return parts.join('\n')
  }

  /**
   * Call LLM for policy analysis using structured outputs
   *
   * Note: LLMProvider interface is designed for UserProfile extraction,
   * so we work around it by calling extractWithStructuredOutput with PolicyAnalysisResult schema.
   * The LLM will return valid PolicyAnalysisResult JSON, which we then extract and validate.
   */
  private async callLLMAnalysis(
    prompt: string,
    schema: ZodSchema
  ): Promise<
    Omit<PolicyAnalysisResult, 'opportunities'> & {
      opportunities: import('@repo/shared').Opportunity[]
      _metadata?: { tokensUsed?: number }
    }
  > {
    try {
      // Call LLM with PolicyAnalysisResultLLMSchema (without file paths)
      // The LLMProvider will validate it against the schema, but return type is ExtractionResult
      const result = await this.llmProvider.extractWithStructuredOutput(prompt, undefined, schema)

      // The profile field contains the LLM response (validated by schema.parse in GeminiProvider)
      // We need to extract it and validate against LLM schema
      const llmData = result.profile as unknown as z.infer<typeof policyAnalysisResultLLMSchema>

      // Validate against LLM schema (without file paths)
      const validated = policyAnalysisResultLLMSchema.parse(llmData)

      // Convert LLM response to full PolicyAnalysisResult structure
      // File paths will be hydrated by normalizer
      return {
        currentPolicy: validated.currentPolicy,
        opportunities: validated.opportunities.map((opp) => ({
          ...opp,
          citation: {
            ...opp.citation,
            file: '', // Will be hydrated by normalizer
          },
        })),
        bundleOptions: validated.bundleOptions.map((bundle) => ({
          ...bundle,
          citation: {
            ...bundle.citation,
            file: '', // Will be hydrated by normalizer
          },
        })),
        deductibleOptimizations: validated.deductibleOptimizations.map((opt) => ({
          ...opt,
          citation: {
            ...opt.citation,
            file: '', // Will be hydrated by normalizer
          },
        })),
        pitch: validated.pitch,
        complianceValidated: validated.complianceValidated,
        _metadata: {
          tokensUsed: result.tokensUsed ?? 0,
        },
      }
    } catch (error) {
      await logError('LLM policy analysis failed', error as Error, {
        type: 'policy_analysis_llm_error',
      })
      throw error
    }
  }
}
