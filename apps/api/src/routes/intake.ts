import type { IntakeResult, PrefillPacket, RouteDecision, UserProfile } from '@repo/shared'
import { prefillPacketSchema, userProfileSchema } from '@repo/shared'
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

      // Generate prefill packet after compliance check
      let prefillPacket: PrefillPacket | undefined
      if (routeDecision) {
        try {
          const missingFieldsForPrefill = getMissingFields(extractionResult.profile)
          prefillPacket = generatePrefillPacket(
            extractionResult.profile,
            routeDecision,
            missingFieldsForPrefill,
            complianceResult.disclaimers || []
          )
        } catch (error) {
          // Handle prefill generation errors gracefully: if generation fails, return IntakeResult with prefill: undefined and log error
          await logError('Prefill generation error in intake endpoint', error as Error, {
            type: 'prefill_error',
          })
          prefillPacket = undefined
        }
      }

      // Build IntakeResult response
      const result: IntakeResult = {
        profile: extractionResult.profile,
        missingFields: extractionResult.missingFields,
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

  // Generate prefill endpoint
  app.post('/api/intake/generate-prefill', async (c) => {
    try {
      // Parse and validate request body
      const body = await c.req.json()
      const validationResult = z
        .object({
          profile: userProfileSchema,
        })
        .safeParse(body)

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

      const { profile } = validationResult.data

      // Call routing engine to get RouteDecision (if not already available)
      let routeDecision: RouteDecision
      try {
        routeDecision = routeToCarrier(profile)
      } catch (error) {
        // Handle routing errors gracefully - still generate prefill with available data
        await logError('Routing engine error in prefill generation', error as Error, {
          type: 'routing_error',
        })
        // Create minimal route decision for prefill generation
        routeDecision = {
          primaryCarrier: 'Unknown',
          eligibleCarriers: [],
          confidence: 0,
          rationale: 'Routing unavailable - prefill generated with available data',
          citations: [],
        }
      }

      // Call compliance filter to get disclaimers for state/product
      let disclaimers: string[] = []
      try {
        const complianceResult = validateOutput(
          '',
          profile.state || undefined,
          profile.productLine || undefined
        )
        disclaimers = complianceResult.disclaimers || []
      } catch (error) {
        // Handle compliance filter errors gracefully
        await logError('Compliance filter error in prefill generation', error as Error, {
          type: 'compliance_error',
        })
        // Use empty disclaimers array
        disclaimers = []
      }

      // Determine missing fields: compare UserProfile against required fields per product type
      const missingFields = getMissingFields(profile)

      // Call prefillGenerator.generatePrefillPacket
      let prefillPacket: PrefillPacket
      try {
        prefillPacket = generatePrefillPacket(profile, routeDecision, missingFields, disclaimers)
      } catch (error) {
        // Handle prefill generation errors gracefully
        await logError('Prefill generation error', error as Error, {
          type: 'prefill_error',
        })
        throw error
      }

      // Validate prefill packet against schema using Zod
      const validationResult2 = prefillPacketSchema.safeParse(prefillPacket)
      if (!validationResult2.success) {
        await logError('Prefill packet validation failed', new Error('Invalid prefill packet'), {
          type: 'validation_error',
          errors: validationResult2.error.errors,
        })
        return c.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Generated prefill packet failed validation',
              details: validationResult2.error.errors,
            },
          },
          500
        )
      }

      // Log decision trace for pre-fill generation
      const trace = createDecisionTrace(
        'conversational',
        {
          profile: {
            state: profile.state,
            productLine: profile.productLine,
            name: profile.name,
          },
        },
        {
          method: 'llm',
          fields: {
            missingFieldsCount: missingFields.length,
            prefillPacketSize: JSON.stringify(prefillPacket).length,
            timestamp: prefillPacket.generatedAt,
          },
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
          passed: true,
          violations: [],
          disclaimersAdded: disclaimers.length,
          state: profile.state || undefined,
          productLine: profile.productLine || undefined,
        }
      )

      await logDecisionTrace(trace)

      // Return PrefillPacket in response
      return c.json(prefillPacket)
    } catch (error) {
      // Log error (error handler middleware will catch and format response)
      await logError('Generate prefill endpoint error', error as Error, {
        type: 'prefill_endpoint_error',
      })

      // Re-throw to let error handler middleware handle it
      throw error
    }
  })

  return app
}
