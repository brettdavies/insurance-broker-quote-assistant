import type {
  IntakeResult,
  MissingField,
  PolicySummary,
  PrefillPacket,
  RouteDecision,
  UserProfile,
} from '@repo/shared'
import { prefillPacketSchema, userProfileSchema } from '@repo/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import { validateOutput } from '../services/compliance-filter'
import type { ConversationalExtractor } from '../services/conversational-extractor'
import { findApplicableDiscounts } from '../services/discount-engine'
import { getCarrierByName } from '../services/knowledge-pack-rag'
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
  pills: userProfileSchema.partial().optional(),
  suppressedFields: z.array(z.string()).optional(),
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

      const { message, pills, suppressedFields, testPitch } = validationResult.data

      // Extract fields using Conversational Extractor
      // Pills are passed as partialFields (single source of truth for structured data)
      // suppressedFields array passed to skip inference for dismissed fields
      const extractionResult = await extractor.extractFields(message, pills, suppressedFields)

      // Build llmCalls array from extraction token usage and prompts
      // Prompts are retrieved from extractor (which gets them from LLM provider instance state)
      const lastPrompts = extractor.getLastPrompts()
      const llmCalls =
        extractionResult.extractionMethod === 'llm' && extractionResult.tokenUsage
          ? [
              {
                agent: 'conversational-extractor',
                model: 'gemini-2.5-flash-lite', // TODO: Get actual model from LLM provider
                promptTokens: extractionResult.tokenUsage.promptTokens,
                completionTokens: extractionResult.tokenUsage.completionTokens,
                totalTokens: extractionResult.tokenUsage.totalTokens,
                systemPrompt: lastPrompts?.systemPrompt,
                userPrompt: lastPrompts?.userPrompt,
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
          message, // Cleaned text (pills removed)
          pills, // Extracted pill data
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
              tiedCarriers: routeDecision.tiedCarriers,
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
            extractionResult.profile.productType ?? undefined,
            extractionResult.profile.state ?? undefined,
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
          extractionResult.profile.productType ?? undefined,
          extractionResult.profile.state ?? undefined
        )
      }

      // Find applicable discounts using discount engine
      let opportunities: IntakeResult['opportunities'] = []
      if (
        routeDecision?.primaryCarrier &&
        extractionResult.profile.state &&
        extractionResult.profile.productType
      ) {
        const carrier = getCarrierByName(routeDecision.primaryCarrier)
        if (carrier) {
          // Convert UserProfile to PolicySummary for discount engine
          // Filter out null values to match PolicySummary schema (which uses optional, not nullish)
          const profile = extractionResult.profile
          const policySummary: PolicySummary = {
            carrier: routeDecision.primaryCarrier,
            ...(profile.name && { name: profile.name }),
            ...(profile.email && { email: profile.email }),
            ...(profile.phone && { phone: profile.phone }),
            ...(profile.zip && { zip: profile.zip }),
            ...(profile.state && { state: profile.state }),
            ...(profile.address && { address: profile.address }),
            ...(profile.productType && { productType: profile.productType }),
            ...(profile.age !== null && profile.age !== undefined && { age: profile.age }),
            ...(profile.householdSize !== null &&
              profile.householdSize !== undefined && { householdSize: profile.householdSize }),
            ...(profile.ownsHome !== null &&
              profile.ownsHome !== undefined && { ownsHome: profile.ownsHome }),
            ...(profile.vehicles !== null &&
              profile.vehicles !== undefined && { vehicles: profile.vehicles }),
            ...(profile.drivers !== null &&
              profile.drivers !== undefined && { drivers: profile.drivers }),
            ...(profile.cleanRecord3Yr !== null &&
              profile.cleanRecord3Yr !== undefined && { cleanRecord3Yr: profile.cleanRecord3Yr }),
            ...(profile.cleanRecord5Yr !== null &&
              profile.cleanRecord5Yr !== undefined && { cleanRecord5Yr: profile.cleanRecord5Yr }),
            ...(profile.existingPolicies && { existingPolicies: profile.existingPolicies }),
          }

          opportunities = findApplicableDiscounts(carrier, policySummary, extractionResult.profile)
        }
      }

      // Build IntakeResult response
      const result: IntakeResult = {
        profile: extractionResult.profile,
        missingFields: missingFieldsForResponse,
        extractionMethod: extractionResult.extractionMethod, // AC5: Include extraction method
        confidence: extractionResult.confidence, // AC5: Include confidence scores
        route: routeDecision, // Routing decision from routing engine
        opportunities, // Discount opportunities from discount engine
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
