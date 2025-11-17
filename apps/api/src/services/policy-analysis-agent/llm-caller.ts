/**
 * LLM Caller for Policy Analysis
 *
 * Handles LLM calls for policy analysis using structured outputs.
 */

import type { PolicyAnalysisResult } from '@repo/shared'
import { DEFAULT_EXTRACTION_TEMPERATURE, policyAnalysisResultLLMSchema } from '@repo/shared'
import type { ZodSchema } from 'zod'
import type { z } from 'zod'
import { logError } from '../../utils/logger'
import type { LLMProvider } from '../llm-provider'

/**
 * Call LLM for policy analysis using structured outputs
 *
 * Note: LLMProvider interface is designed for UserProfile extraction,
 * so we work around it by calling extractWithStructuredOutput with PolicyAnalysisResult schema.
 * The LLM will return valid PolicyAnalysisResult JSON, which we then extract and validate.
 */
export async function callLLMAnalysis(
  llmProvider: LLMProvider,
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
    // Use temperature 0.1 for policy analysis (deterministic behavior, similar to extraction)
    const result = await llmProvider.extractWithStructuredOutput(
      prompt,
      schema,
      undefined, // No partial fields for policy analysis
      DEFAULT_EXTRACTION_TEMPERATURE // Temperature for analysis (deterministic behavior)
    )

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
        product: bundle.product as 'auto' | 'home' | 'renters' | 'umbrella',
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
