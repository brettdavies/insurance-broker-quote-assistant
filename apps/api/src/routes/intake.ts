import type {
  IntakeResult,
  MissingField,
  PrefillPacket,
  RouteDecision,
  UserProfile,
} from '@repo/shared'
import { prefillPacketSchema } from '@repo/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import { validateOutput } from '../services/compliance-filter'
import type { ConversationalExtractor } from '../services/conversational-extractor'
import type { LLMProvider } from '../services/llm-provider'
import { generatePrefillPacket, getMissingFields } from '../services/prefill-generator'
import { routeToCarrier } from '../services/routing-engine'
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
  // Test-only field: allows injecting a pitch for end-to-end compliance testing
  // Only accepted when NODE_ENV=test
  testPitch: z.string().optional(),
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

      const { message, conversationHistory, testPitch } = validationResult.data

      // Extract fields using Conversational Extractor
      const extractionResult = await extractor.extractFields(message, conversationHistory)

      // Build llmCalls array from extraction token usage
      const llmCalls =
        extractionResult.extractionMethod === 'llm' && extractionResult.tokenUsage
          ? [
              {
                agent: 'conversational-extractor',
                model: 'gemini-2.5-flash-lite', // TODO: Get actual model from LLM provider
                promptTokens: extractionResult.tokenUsage.promptTokens,
                completionTokens: extractionResult.tokenUsage.completionTokens,
                totalTokens: extractionResult.tokenUsage.totalTokens,
              },
            ]
          : undefined

      // Route to eligible carriers using Routing Engine
      let routeDecision: RouteDecision | undefined
      try {
        routeDecision = routeToCarrier(extractionResult.profile)
      } catch (error) {
        // Handle routing errors gracefully
        await logError('Routing engine error', error as Error, {
          type: 'routing_error',
        })
        // Continue with undefined route decision
        routeDecision = undefined
      }

      // Generate pitch (currently empty for MVP, but compliance filter runs on it)
      // In test mode, allow injecting a pitch via testPitch for end-to-end compliance testing
      let pitch = ''
      if (process.env.NODE_ENV === 'test' && testPitch !== undefined && testPitch !== null) {
        pitch = testPitch
      }

      // Run compliance filter on pitch
      let complianceResult: ReturnType<typeof validateOutput>
      try {
        complianceResult = validateOutput(
          pitch,
          extractionResult.profile.state,
          extractionResult.profile.productType
        )
      } catch (error) {
        // Handle compliance filter errors gracefully
        await logError('Compliance filter error', error as Error, {
          type: 'compliance_error',
        })
        // Default to failed compliance check
        complianceResult = {
          passed: false,
          disclaimers: [],
        }
      }

      // If compliance check failed, replace pitch with replacement message
      if (!complianceResult.passed && complianceResult.replacementMessage) {
        pitch = complianceResult.replacementMessage
      }

      // Create decision trace with routing decision and compliance check
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
        },
        llmCalls, // Include LLM token usage if available
        routeDecision
          ? {
              eligibleCarriers: routeDecision.eligibleCarriers,
              primaryCarrier: routeDecision.primaryCarrier,
              matchScores: routeDecision.matchScores,
              confidence: routeDecision.confidence,
              rationale: routeDecision.rationale,
              citations: routeDecision.citations,
              rulesEvaluated: routeDecision.citations.map((c) => c.file),
            }
          : undefined,
        {
          passed: complianceResult.passed,
          violations: complianceResult.violations,
          disclaimersAdded: complianceResult.disclaimers?.length || 0,
          state: complianceResult.state,
          productType: complianceResult.productType,
        }
      )

      // Log decision trace to compliance log
      await logDecisionTrace(trace)

      // Generate prefill packet after compliance check
      let prefillPacket: PrefillPacket | undefined
      let missingFieldsForResponse: MissingField[] = []
      if (routeDecision) {
        try {
          // Get missing fields with carrier/state-specific requirements
          missingFieldsForResponse = getMissingFields(
            extractionResult.profile,
            extractionResult.profile.productType,
            extractionResult.profile.state,
            routeDecision.primaryCarrier
          )
          prefillPacket = generatePrefillPacket(
            extractionResult.profile,
            routeDecision,
            missingFieldsForResponse,
            complianceResult.disclaimers || []
          )
        } catch (error) {
          // Handle prefill generation errors gracefully: if generation fails, return IntakeResult with prefill: undefined and log error
          await logError('Prefill generation error in intake endpoint', error as Error, {
            type: 'prefill_error',
          })
          prefillPacket = undefined
        }
      } else {
        // If no route decision, still calculate missing fields without carrier-specific requirements
        missingFieldsForResponse = getMissingFields(
          extractionResult.profile,
          extractionResult.profile.productType,
          extractionResult.profile.state
        )
      }

      // Build IntakeResult response
      const result: IntakeResult = {
        profile: extractionResult.profile,
        missingFields: missingFieldsForResponse,
        extractionMethod: extractionResult.extractionMethod, // AC5: Include extraction method
        confidence: extractionResult.confidence, // AC5: Include confidence scores
        route: routeDecision, // Routing decision from routing engine
        opportunities: [], // Stub for discount engine (future story)
        prefill: prefillPacket, // Prefill packet for broker handoff
        pitch, // Pitch (may be replaced by compliance filter replacement message)
        complianceValidated: complianceResult.passed,
        disclaimers: complianceResult.disclaimers,
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

  // Note: Generate prefill endpoint moved to main app at /api/generate-prefill
  // This allows Hono RPC client to work properly (nested routes not well supported)

  return app
}
