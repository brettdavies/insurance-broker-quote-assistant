/**
 * Policy Analyze Handler
 *
 * Handles policy analysis requests.
 */

import type { PolicySummary } from '@repo/shared'
import { ERROR_CODES, ERROR_MESSAGES, policySummarySchema } from '@repo/shared'
import type { Context } from 'hono'
import { z } from 'zod'
import type { LLMProvider } from '../../../services/llm-provider'
import { orchestratePolicyAnalysis } from '../../../services/policy-analysis-orchestrator'
import { logError } from '../../../utils/logger'

/**
 * Request schema for policy analyze endpoint
 *
 * Note: policyText is optional and user-facing only (for validation/debugging).
 * PolicySummary is the source of truth for system processing.
 */
const policyAnalyzeRequestSchema = z.object({
  policySummary: policySummarySchema, // Required - system SoT
  policyText: z.string().optional(), // Optional - user-facing only, not used for processing
})

type PolicyAnalyzeRequest = z.infer<typeof policyAnalyzeRequestSchema>

/**
 * Handle policy analysis request
 */
export async function handlePolicyAnalyze(c: Context, llmProvider: LLMProvider): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await c.req.json()
    const validationResult = policyAnalyzeRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return c.json(
        {
          error: {
            code: ERROR_CODES.INVALID_REQUEST,
            message: ERROR_MESSAGES.INVALID_REQUEST_BODY,
            details: validationResult.error.errors,
          },
        },
        400
      )
    }

    const { policySummary, policyText } = validationResult.data

    // PolicySummary is the source of truth - use it directly
    // Optional: If policyText provided, validate it matches PolicySummary (for debugging)
    if (policyText) {
      const { parsePolicySummaryFromKeyValueText, policiesMatch } = await import(
        '../../../utils/policy-key-value-parser'
      )
      const parsedFromText = parsePolicySummaryFromKeyValueText(policyText)
      if (!policiesMatch(parsedFromText, policySummary)) {
        // Log warning but don't fail - PolicySummary is SoT
        await logError(
          'PolicySummary and policyText mismatch in analyze endpoint',
          new Error('Sync issue detected'),
          {
            type: 'policy_sync_warning',
            policyTextPreview: policyText.substring(0, 500),
          }
        )
      }
    }

    // Orchestrate policy analysis
    try {
      const orchestratorResult = await orchestratePolicyAnalysis({
        policySummary,
        policyText,
        llmProvider,
      })

      return c.json(orchestratorResult.result, 200)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Handle specific error types
      if (errorMessage.includes('missing required fields')) {
        return c.json(
          {
            error: {
              code: ERROR_CODES.VALIDATION_ERROR,
              message: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS,
              details: errorMessage,
            },
          },
          400
        )
      }

      if (errorMessage.includes('not found in knowledge pack')) {
        return c.json(
          {
            error: {
              code: ERROR_CODES.KNOWLEDGE_PACK_ERROR,
              message: ERROR_MESSAGES.CARRIER_NOT_FOUND,
              details: errorMessage,
            },
          },
          404
        )
      }

      if (errorMessage.includes('KNOWLEDGE_PACK_ERROR')) {
        return c.json(
          {
            error: {
              code: ERROR_CODES.KNOWLEDGE_PACK_ERROR,
              message: ERROR_MESSAGES.CARRIER_NOT_FOUND,
              details: errorMessage.replace('KNOWLEDGE_PACK_ERROR: ', ''),
            },
          },
          404
        )
      }

      if (errorMessage.includes('ANALYSIS_ERROR')) {
        return c.json(
          {
            error: {
              code: ERROR_CODES.ANALYSIS_ERROR,
              message: ERROR_MESSAGES.LLM_ANALYSIS_FAILED,
              details: errorMessage.replace('ANALYSIS_ERROR: ', ''),
            },
          },
          500
        )
      }

      // Generic analysis error
      await logError('Policy analysis orchestration failed', error as Error, {
        type: 'policy_analysis_error',
        carrier: policySummary.carrier,
        state: policySummary.state,
      })

      return c.json(
        {
          error: {
            code: ERROR_CODES.ANALYSIS_ERROR,
            message: ERROR_MESSAGES.POLICY_ANALYSIS_FAILED,
            details: errorMessage,
          },
        },
        500
      )
    }
  } catch (error) {
    await logError('Policy analyze endpoint error', error as Error, {
      type: 'policy_analyze_error',
    })
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    )
  }
}
