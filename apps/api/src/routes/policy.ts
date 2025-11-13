/**
 * Policy Route
 *
 * POST /api/policy/upload endpoint for policy document upload and parsing.
 *
 * @see docs/stories/2.1.policy-upload-pdf-parsing.md#task-2
 */

import type { PolicySummary } from '@repo/shared'
import {
  DEFAULT_GEMINI_MODEL,
  ERROR_CODES,
  ERROR_DETAILS,
  ERROR_MESSAGES,
  policySummarySchema,
} from '@repo/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import type { ConversationalExtractor } from '../services/conversational-extractor'
import { isValidFileObject, validateFile } from '../services/file-validator'
import * as knowledgePackRAG from '../services/knowledge-pack-rag'
import type { LLMProvider } from '../services/llm-provider'
import { orchestratePolicyAnalysis } from '../services/policy-analysis-orchestrator'
import { createDecisionTrace, logDecisionTrace } from '../utils/decision-trace'
import { logError, logInfo } from '../utils/logger'
import { convertPolicySummaryToKeyValueText } from '../utils/policy-key-value-converter'

// Note: Text extraction functions removed - files are now passed directly to Gemini File API
// Gemini handles PDF/DOCX/TXT parsing natively, no need for separate text extraction step

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
 * Create policy route handler
 *
 * @param extractor - ConversationalExtractor service instance
 * @param llmProvider - LLM provider for policy analysis
 * @returns Hono route handler
 */
export function createPolicyRoute(extractor: ConversationalExtractor, llmProvider: LLMProvider) {
  const app = new Hono()

  app.post('/api/policy/upload', async (c) => {
    try {
      // Parse multipart/form-data
      const formData = await c.req.parseBody()
      const file = formData.file as File | undefined

      // In Hono, parseBody() returns files as File objects, but we need to check more carefully
      // File might be a File object or a File-like object depending on the environment
      if (!file) {
        await logError('No file in request', new Error('File missing'), {
          type: 'file_upload_error',
          formDataKeys: Object.keys(formData),
        })
        return c.json(
          {
            error: {
              code: ERROR_CODES.INVALID_REQUEST,
              message: ERROR_MESSAGES.NO_FILE_PROVIDED,
              details: ERROR_DETAILS.FILE_MULTIPART_REQUIRED,
            },
          },
          400
        )
      }

      // Check if it's a File object (works in Node.js/Bun environments)
      if (!isValidFileObject(file)) {
        await logError('Invalid file type', new Error('File is not a File object'), {
          type: 'file_upload_error',
          fileType: typeof file,
          fileKeys: typeof file === 'object' && file !== null ? Object.keys(file) : [],
        })
        return c.json(
          {
            error: {
              code: ERROR_CODES.INVALID_REQUEST,
              message: ERROR_MESSAGES.INVALID_FILE_FORMAT,
              details: ERROR_DETAILS.FILE_MUST_BE_VALID_OBJECT,
            },
          },
          400
        )
      }

      // Validate file
      const validation = validateFile(file)
      if (!validation.valid) {
        return c.json(
          {
            error: {
              code: ERROR_CODES.INVALID_FILE,
              message: validation.error || ERROR_MESSAGES.FILE_VALIDATION_FAILED,
              details: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
              },
            },
          },
          400
        )
      }

      // Extract policy data directly from file using Gemini (no text extraction needed)
      let policySummary: PolicySummary
      let tokensUsed = 0
      let extractionTime = 0
      try {
        const extractionResult = await extractor.extractPolicyDataFromFile(file)
        // Extract metadata before removing it
        tokensUsed = extractionResult._metadata?.tokensUsed || 0
        extractionTime = extractionResult._metadata?.extractionTime || 0
        // Remove metadata before using as PolicySummary
        const { _metadata, ...summary } = extractionResult
        policySummary = summary

        // Check if extraction actually returned any data
        const extractedFields = Object.keys(policySummary).filter(
          (key) => key !== 'confidence' && policySummary[key as keyof PolicySummary] !== undefined
        )

        if (extractedFields.length === 0) {
          await logError(
            'Policy extraction returned no data',
            new Error('Empty extraction result'),
            {
              fileName: file.name,
              fileType: file.type,
              reasoning: extractionResult._metadata?.reasoning,
            }
          )
          return c.json(
            {
              error: {
                code: ERROR_CODES.EXTRACTION_ERROR,
                message: ERROR_MESSAGES.EXTRACTION_FAILED,
                details: extractionResult._metadata?.reasoning || ERROR_MESSAGES.NO_DATA_EXTRACTED,
              },
            },
            500
          )
        }

        await logInfo('Policy data extracted from file', {
          fileName: file.name,
          fileSize: file.size,
          extractedFields,
          tokensUsed,
          extractionTime,
        })
      } catch (error) {
        await logError('Policy extraction from file failed', error as Error, {
          fileName: file.name,
          fileType: file.type,
        })
        return c.json(
          {
            error: {
              code: ERROR_CODES.EXTRACTION_ERROR,
              message: ERROR_MESSAGES.EXTRACTION_FAILED,
              details: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
            },
          },
          500
        )
      }

      // Convert PolicySummary to key-value text format for display in editor
      const keyValueText = convertPolicySummaryToKeyValueText(policySummary)

      // Log decision trace with actual token usage and extraction time
      const decisionTrace = createDecisionTrace(
        'policy',
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          extractedTextLength: keyValueText.length,
          extractedTextPreview: keyValueText.substring(0, 500),
        },
        {
          method: 'llm', // LLM extraction from file
          fields: policySummary,
          confidence: policySummary.confidence,
        },
        [
          {
            agent: 'conversational-extractor',
            model: DEFAULT_GEMINI_MODEL, // Using GeminiProvider per implementation notes
            totalTokens: tokensUsed, // Actual tokens used from LLM response
          },
        ]
      )

      await logDecisionTrace(decisionTrace)

      // Return key-value text format for display in editor
      // Broker can review and edit before sending for competitive shopping
      return c.json(
        {
          extractedText: keyValueText,
          fileName: file.name,
          policySummary, // Also include structured data for potential future use
        },
        200
      )
    } catch (error) {
      await logError('Policy upload endpoint error', error as Error, {
        type: 'policy_upload_error',
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
  })

  // POST /api/policy/analyze endpoint
  app.post('/api/policy/analyze', async (c) => {
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
          '../utils/policy-key-value-parser'
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
  })

  return app
}
