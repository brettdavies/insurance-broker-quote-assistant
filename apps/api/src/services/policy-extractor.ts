/**
 * Policy Extractor Service
 *
 * Handles policy data extraction from files and text.
 * Single Responsibility: Policy extraction only
 */

import type { PolicySummary } from '@repo/shared'
import { policySummarySchema } from '@repo/shared'
import { buildPolicyConfidenceMap } from '../utils/confidence-builder'
import { logError } from '../utils/logger'
import { validatePolicySummary } from './extractors/policy-validator'
import type { LLMProvider } from './llm-provider'

/**
 * Extract policy data directly from a policy document file
 *
 * @param llmProvider - LLM provider instance
 * @param file - Policy document file (PDF, DOCX, TXT)
 * @returns PolicySummary with extracted fields and confidence scores, plus metadata (tokens, timing)
 */
export async function extractPolicyDataFromFile(
  llmProvider: LLMProvider,
  file: File
): Promise<
  PolicySummary & {
    _metadata?: { tokensUsed?: number; extractionTime?: number; reasoning?: string }
  }
> {
  try {
    // Check if LLM provider supports direct file extraction
    if (llmProvider.extractFromFile) {
      const prompt =
        'Extract policy information from this insurance policy document. Extract all relevant fields including carrier, state, product type, coverage limits, deductibles, premiums, and effective dates according to the provided schema.'

      const llmResult = await llmProvider.extractFromFile(file, prompt, policySummarySchema)

      // Validate extracted policy summary against schema
      const validatedSummary = validatePolicySummary(
        llmResult.profile as unknown as Partial<PolicySummary>
      )

      // Build confidence scores from LLM result
      const confidenceScores = buildPolicyConfidenceMap(validatedSummary, llmResult.confidence)

      // Return PolicySummary with metadata attached (will be stripped before returning to client)
      return {
        ...validatedSummary,
        confidence: confidenceScores,
        _metadata: {
          tokensUsed: llmResult.tokensUsed,
          extractionTime: llmResult.extractionTime,
          reasoning: llmResult.reasoning,
        },
      }
    }

    // Fallback: Extract text first, then use LLM
    throw new Error('Direct file extraction not supported by LLM provider')
  } catch (error) {
    // Log error but return partial result (graceful degradation)
    await logError('Policy extraction from file failed', error as Error, {
      type: 'policy_extraction_error',
      fileName: file.name,
    })

    // Return empty policy summary with low confidence
    return {
      carrier: undefined,
      state: undefined,
      productType: undefined,
      coverageLimits: undefined,
      deductibles: undefined,
      premiums: undefined,
      effectiveDates: undefined,
      confidence: {
        carrier: 0.0,
        state: 0.0,
        productType: 0.0,
        coverageLimits: 0.0,
        deductibles: 0.0,
        premiums: 0.0,
        effectiveDates: 0.0,
      },
    }
  }
}

/**
 * Extract policy data from policy document text (fallback method)
 *
 * @param llmProvider - LLM provider instance
 * @param policyText - Raw text extracted from PDF/DOCX/TXT policy document
 * @returns PolicySummary with extracted fields and confidence scores
 */
export async function extractPolicyData(
  llmProvider: LLMProvider,
  policyText: string
): Promise<PolicySummary> {
  try {
    // Use LLM to extract structured policy data from text
    const llmResult = await llmProvider.extractWithStructuredOutput(policyText, policySummarySchema)

    // Validate extracted policy summary against schema
    // LLM returns profile as Partial<UserProfile> type, but content matches PolicySummary schema
    const validatedSummary = validatePolicySummary(
      llmResult.profile as unknown as Partial<PolicySummary>
    )

    // Build confidence scores from LLM result
    const confidenceScores = buildPolicyConfidenceMap(validatedSummary, llmResult.confidence)

    return {
      ...validatedSummary,
      confidence: confidenceScores,
    }
  } catch (error) {
    // Log error but return partial result (graceful degradation)
    await logError('Policy extraction failed', error as Error, {
      type: 'policy_extraction_error',
      policyTextPreview: policyText.substring(0, 500),
    })

    // Return empty policy summary with low confidence
    return {
      name: undefined,
      email: undefined,
      phone: undefined,
      zip: undefined,
      state: undefined,
      address: undefined,
      carrier: undefined,
      productType: undefined,
      coverageLimits: undefined,
      deductibles: undefined,
      premiums: undefined,
      effectiveDates: undefined,
      confidence: {
        name: 0.0,
        email: 0.0,
        phone: 0.0,
        zip: 0.0,
        state: 0.0,
        address: 0.0,
        carrier: 0.0,
        productType: 0.0,
        coverageLimits: 0.0,
        deductibles: 0.0,
        premiums: 0.0,
        effectiveDates: 0.0,
      },
    }
  }
}
