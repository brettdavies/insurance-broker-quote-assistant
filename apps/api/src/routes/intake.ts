import { Hono } from 'hono'
import { z } from 'zod'
import type { IntakeResult } from '@repo/shared'
import { ConversationalExtractor } from '../services/conversational-extractor'
import type { LLMProvider } from '../services/llm-provider'
import { createDecisionTrace, logDecisionTrace } from '../utils/decision-trace'
import { logError } from '../utils/logger'

/**
 * Intake Route
 *
 * POST /api/intake endpoint for conversational field extraction.
 *
 * @see docs/stories/1.5.conversational-extractor.md#task-4
 */

// Request body schema
const intakeRequestSchema = z.object({
  message: z.string().min(1),
  conversationHistory: z.array(z.string()).optional(),
})

type IntakeRequest = z.infer<typeof intakeRequestSchema>

/**
 * Create intake route handler
 *
 * @param extractor - ConversationalExtractor service instance
 * @returns Hono route handler
 */
export function createIntakeRoute(extractor: ConversationalExtractor) {
  const app = new Hono()

  app.post('/api/intake', async (c) => {
    try {
      // Parse and validate request body
      const body = await c.req.json()
      const validationResult = intakeRequestSchema.safeParse(body)

      if (!validationResult.success) {
        return c.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid request body',
              details: validationResult.error.errors,
            },
          },
          400
        )
      }

      const { message, conversationHistory } = validationResult.data

      // Extract fields using Conversational Extractor
      const extractionResult = await extractor.extractFields(
        message,
        conversationHistory
      )

      // Create decision trace
      const trace = createDecisionTrace(
        'conversational',
        {
          message,
          conversationHistory: conversationHistory || [],
        },
        {
          method: extractionResult.extractionMethod,
          fields: extractionResult.profile,
          confidence: extractionResult.confidence,
          reasoning: extractionResult.reasoning,
        }
      )

      // Log decision trace to compliance log
      await logDecisionTrace(trace)

      // Build IntakeResult response (MVP version with stubs)
      const result: IntakeResult = {
        profile: extractionResult.profile,
        missingFields: extractionResult.missingFields,
        extractionMethod: extractionResult.extractionMethod, // AC5: Include extraction method
        confidence: extractionResult.confidence, // AC5: Include confidence scores
        route: undefined, // Stub for routing engine (future story)
        opportunities: [], // Stub for discount engine (future story)
        prefill: undefined, // Stub for prefill packet (future story)
        pitch: '', // Empty for MVP
        complianceValidated: true, // Will be updated by compliance filter (future story)
        trace,
      }

      return c.json(result)
    } catch (error) {
      // Log error (error handler middleware will catch and format response)
      await logError('Intake endpoint error', error as Error, {
        type: 'intake_error',
      })

      // Re-throw to let error handler middleware handle it
      throw error
    }
  })

  return app
}

