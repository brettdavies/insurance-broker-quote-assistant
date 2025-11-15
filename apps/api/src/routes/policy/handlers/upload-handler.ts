/**
 * Policy Upload Handler
 *
 * Handles file upload, validation, and policy data extraction.
 */

import type { PolicySummary } from '@repo/shared'
import { DEFAULT_GEMINI_MODEL, ERROR_CODES, ERROR_DETAILS, ERROR_MESSAGES } from '@repo/shared'
import type { Context } from 'hono'
import type { ConversationalExtractor } from '../../../services/conversational-extractor'
import { isValidFileObject, validateFile } from '../../../services/file-validator'
import { createDecisionTrace, logDecisionTrace } from '../../../utils/decision-trace'
import { logError, logInfo } from '../../../utils/logger'
import { convertPolicySummaryToKeyValueText } from '../../../utils/policy-key-value-converter'

/**
 * Handle policy file upload
 */
export async function handlePolicyUpload(
  c: Context,
  extractor: ConversationalExtractor
): Promise<Response> {
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
        await logError('Policy extraction returned no data', new Error('Empty extraction result'), {
          fileName: file.name,
          fileType: file.type,
          reasoning: extractionResult._metadata?.reasoning,
        })
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
}
