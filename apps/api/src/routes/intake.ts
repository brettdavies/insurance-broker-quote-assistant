import type { IntakeResult, RouteDecision } from '@repo/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import { validateOutput } from '../services/compliance-filter'
import type { ConversationalExtractor } from '../services/conversational-extractor'
import type { LLMProvider } from '../services/llm-provider'
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
          extractionResult.profile.productLine
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
        undefined, // llmCalls
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
          productLine: complianceResult.productLine,
        }
      )

      // Log decision trace to compliance log
      await logDecisionTrace(trace)

      // Build IntakeResult response
      const result: IntakeResult = {
        profile: extractionResult.profile,
        missingFields: extractionResult.missingFields,
        extractionMethod: extractionResult.extractionMethod, // AC5: Include extraction method
        confidence: extractionResult.confidence, // AC5: Include confidence scores
        route: routeDecision, // Routing decision from routing engine
        opportunities: [], // Stub for discount engine (future story)
        prefill: undefined, // Stub for prefill packet (future story)
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

  return app
}
