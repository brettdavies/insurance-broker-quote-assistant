/**
 * Policy Route
 *
 * POST /api/policy/upload endpoint for policy document upload and parsing.
 *
 * @see docs/stories/2.1.policy-upload-pdf-parsing.md#task-2
 */

import type { PolicySummary } from '@repo/shared'
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE,
  isAcceptedFileType,
  isFileSizeValid,
} from '@repo/shared'
import { policySummarySchema } from '@repo/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import type { ConversationalExtractor } from '../services/conversational-extractor'
import { createDecisionTrace, logDecisionTrace } from '../utils/decision-trace'
import { logError, logInfo } from '../utils/logger'

// Note: Text extraction functions removed - files are now passed directly to Gemini File API
// Gemini handles PDF/DOCX/TXT parsing natively, no need for separate text extraction step

/**
 * Convert PolicySummary to key-value text format for display in editor
 * Example: "carrier:GEICO state:CA productType:auto premium:$1200/yr deductible:$500"
 */
function convertPolicySummaryToKeyValueText(policySummary: PolicySummary): string {
  const parts: string[] = []

  if (policySummary.carrier) {
    parts.push(`carrier:${policySummary.carrier}`)
  }
  if (policySummary.state) {
    parts.push(`state:${policySummary.state}`)
  }
  if (policySummary.productType) {
    parts.push(`productType:${policySummary.productType}`)
  }

  // Coverage limits
  if (policySummary.coverageLimits) {
    const limits = policySummary.coverageLimits
    if (limits.liability) parts.push(`coverageLimit:liability:${limits.liability}`)
    if (limits.propertyDamage) parts.push(`coverageLimit:propertyDamage:${limits.propertyDamage}`)
    if (limits.comprehensive) parts.push(`coverageLimit:comprehensive:${limits.comprehensive}`)
    if (limits.collision) parts.push(`coverageLimit:collision:${limits.collision}`)
    if (limits.uninsuredMotorist)
      parts.push(`coverageLimit:uninsuredMotorist:${limits.uninsuredMotorist}`)
    if (limits.personalInjuryProtection)
      parts.push(`coverageLimit:personalInjuryProtection:${limits.personalInjuryProtection}`)
    if (limits.dwelling) parts.push(`coverageLimit:dwelling:${limits.dwelling}`)
    if (limits.personalProperty)
      parts.push(`coverageLimit:personalProperty:${limits.personalProperty}`)
    if (limits.lossOfUse) parts.push(`coverageLimit:lossOfUse:${limits.lossOfUse}`)
    if (limits.medicalPayments)
      parts.push(`coverageLimit:medicalPayments:${limits.medicalPayments}`)
  }

  // Deductibles
  if (policySummary.deductibles) {
    const deductibles = policySummary.deductibles
    if (deductibles.auto !== undefined) parts.push(`deductible:auto:${deductibles.auto}`)
    if (deductibles.home !== undefined) parts.push(`deductible:home:${deductibles.home}`)
    if (deductibles.comprehensive !== undefined)
      parts.push(`deductible:comprehensive:${deductibles.comprehensive}`)
    if (deductibles.collision !== undefined)
      parts.push(`deductible:collision:${deductibles.collision}`)
  }

  // Premiums
  if (policySummary.premiums) {
    const premiums = policySummary.premiums
    if (premiums.annual) parts.push(`premium:annual:$${premiums.annual}/yr`)
    if (premiums.monthly) parts.push(`premium:monthly:$${premiums.monthly}/mo`)
    if (premiums.semiAnnual) parts.push(`premium:semiAnnual:$${premiums.semiAnnual}/6mo`)
  }

  // Effective dates
  if (policySummary.effectiveDates) {
    const dates = policySummary.effectiveDates
    if (dates.effectiveDate) parts.push(`effectiveDate:${dates.effectiveDate}`)
    if (dates.expirationDate) parts.push(`expirationDate:${dates.expirationDate}`)
  }

  // Join with spaces and add trailing space to trigger pill transformation
  return `${parts.join(' ')} `
}

/**
 * Validate uploaded file using shared constants (single source of truth)
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Validate file size using shared constant
  if (!isFileSizeValid(file.size)) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    }
  }

  // Validate file type using shared constant
  if (!isAcceptedFileType(file.name, file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Supported: PDF, DOCX, TXT. Got: ${file.type || file.name}`,
    }
  }

  return { valid: true }
}

/**
 * Create policy upload route handler
 *
 * @param extractor - ConversationalExtractor service instance (will be extended for policy extraction)
 * @returns Hono route handler
 */
export function createPolicyRoute(extractor: ConversationalExtractor) {
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
              code: 'INVALID_REQUEST',
              message: 'No file provided',
              details: 'Request must include a file in multipart/form-data',
            },
          },
          400
        )
      }

      // Check if it's a File object (works in Node.js/Bun environments)
      // In Hono, files from parseBody() should be File objects
      const isFile =
        file instanceof File ||
        (typeof file === 'object' &&
          file !== null &&
          'name' in file &&
          'size' in file &&
          'type' in file &&
          'arrayBuffer' in file)

      if (!isFile) {
        await logError('Invalid file type', new Error('File is not a File object'), {
          type: 'file_upload_error',
          fileType: typeof file,
          fileKeys: typeof file === 'object' && file !== null ? Object.keys(file) : [],
        })
        return c.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid file format',
              details: 'File must be a valid File object',
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
              code: 'INVALID_FILE',
              message: validation.error || 'File validation failed',
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
                code: 'EXTRACTION_ERROR',
                message: 'Failed to extract policy data from file',
                details:
                  extractionResult._metadata?.reasoning || 'No data could be extracted from the file',
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
              code: 'EXTRACTION_ERROR',
              message: 'Failed to extract policy data from file',
              details: error instanceof Error ? error.message : 'Unknown error',
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
            model: 'gemini-2.5-flash-lite', // Using GeminiProvider per implementation notes
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

  return app
}
