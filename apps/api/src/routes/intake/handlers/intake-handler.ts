/**
 * Intake Handler
 *
 * Main handler for the /api/intake endpoint.
 */

import {
  type PrefillPacket,
  type RouteDecision,
  type UserProfile,
  removePillMarkers,
} from '@repo/shared'
import type { Context } from 'hono'
import { validateOutput } from '../../../services/compliance-filter'
import type { ConversationalExtractor } from '../../../services/conversational-extractor'
import { getMissingFields } from '../../../services/prefill-generator'
import { routeToCarrier } from '../../../services/routing-engine'
import { createDecisionTrace, logDecisionTrace } from '../../../utils/decision-trace'
import { logDebug, logError } from '../../../utils/logger'
import { setupInferenceEngine } from './inference-setup'
import { buildIntakeResult, generatePrefillData } from './result-builder'

/**
 * Handle intake request
 */
export async function handleIntake(
  c: Context,
  extractor: ConversationalExtractor,
  message: string,
  userProfile: Partial<UserProfile> | undefined,
  legacyPills: Record<string, unknown> | undefined,
  legacySuppressed: string[] | undefined,
  testPitch: string | undefined
): Promise<Response> {
  try {
    // Extract known/inferred/suppressed from userProfile
    // Known fields = all fields except metadata (keys starting with _)
    const knownFields: Partial<UserProfile> = {}
    const inferredFields: Partial<UserProfile> = {}
    const suppressedFields: string[] = []

    if (userProfile) {
      // Extract known fields (main object, excluding metadata)
      for (const [key, value] of Object.entries(userProfile)) {
        if (!key.startsWith('_') && value !== null && value !== undefined) {
          // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
          knownFields[key as keyof UserProfile] = value as any
        }
      }

      // Extract inferred fields from _inferred object
      if (userProfile._inferred) {
        Object.assign(inferredFields, userProfile._inferred)
      }

      // Extract suppressed fields from _suppressed array
      if (userProfile._suppressed) {
        suppressedFields.push(...userProfile._suppressed)
      }
    } else {
      // Legacy support: use pills as knownFields
      Object.assign(knownFields, legacyPills || {})
      suppressedFields.push(...(legacySuppressed || []))
    }

    // Remove pill markers from message before sending to LLM
    // Pill markers are in format [[key:value]] and must be stripped
    const cleanedMessage = removePillMarkers(message)

    // Log pill marker removal for debugging
    if (cleanedMessage !== message) {
      await logDebug('Removed pill markers from message', {
        original: message,
        cleaned: cleanedMessage,
      })
    }

    // Setup inference engine and apply inferences
    // Note: inferredFields from userProfile are already extracted above
    // This will add any additional inferences from the message
    const { inferredFields: additionalInferredFields } = setupInferenceEngine(
      knownFields,
      cleanedMessage,
      suppressedFields
    )
    // Merge userProfile inferred fields with additional inferred fields
    Object.assign(inferredFields, additionalInferredFields)

    // Extract fields using Conversational Extractor
    // Pass cleanedMessage (without pill markers), knownFields (pills), inferredFields, and suppressedFields
    const extractionResult = await extractor.extractFields(
      cleanedMessage,
      knownFields,
      inferredFields,
      suppressedFields
    )

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
      // Log profile state for debugging
      await logDebug('Routing engine: Profile state', {
        state: extractionResult.profile.state,
        productType: extractionResult.profile.productType,
        hasState: !!extractionResult.profile.state,
        hasProductType: !!extractionResult.profile.productType,
      })

      routeDecision = routeToCarrier(extractionResult.profile)

      // Log routing result
      await logDebug('Routing engine: Route decision', {
        primaryCarrier: routeDecision.primaryCarrier,
        eligibleCarriersCount: routeDecision.eligibleCarriers.length,
        confidence: routeDecision.confidence,
      })
    } catch (error) {
      // Handle routing errors gracefully
      await logError('Routing engine error', error as Error, {
        type: 'routing_error',
        profileState: extractionResult.profile.state,
        profileProductType: extractionResult.profile.productType,
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
        message: cleanedMessage, // Cleaned text (pill markers removed)
        pills: legacyPills || knownFields, // Extracted pill data (backward compatibility)
        knownFields, // Pills as known fields
        inferredFields, // Fields inferred from text patterns
        suppressedFields, // Fields explicitly dismissed by broker
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
            rulesEvaluated: routeDecision.citations.map((c: { file: string }) => c.file),
          }
        : undefined,
      {
        passed: complianceResult.passed,
        violations: complianceResult.violations ?? undefined,
        disclaimersAdded: complianceResult.disclaimers?.length || 0,
        state: complianceResult.state ?? undefined,
        productType: complianceResult.productType ?? undefined,
      }
    )

    // Log decision trace to compliance log
    await logDecisionTrace(trace)

    // Generate prefill packet after compliance check
    let prefillPacket: PrefillPacket | undefined
    let missingFieldsForResponse: Array<{
      field: string
      priority: 'critical' | 'important' | 'optional'
    }> = []
    try {
      const prefillData = await generatePrefillData(
        extractionResult.profile,
        routeDecision,
        complianceResult.disclaimers || []
      )
      prefillPacket = prefillData.prefillPacket
      missingFieldsForResponse = prefillData.missingFields
    } catch (error) {
      // Handle prefill generation errors gracefully: if generation fails, return IntakeResult with prefill: undefined and log error
      await logError('Prefill generation error in intake endpoint', error as Error, {
        type: 'prefill_error',
      })
      prefillPacket = undefined
      // Still calculate missing fields even if prefill generation fails
      missingFieldsForResponse = getMissingFields(
        extractionResult.profile,
        extractionResult.profile.productType ?? undefined,
        extractionResult.profile.state ?? undefined,
        routeDecision?.primaryCarrier
      )
    }

    // Build and return result
    const result = await buildIntakeResult(
      extractionResult,
      routeDecision,
      {
        passed: complianceResult.passed,
        disclaimers: complianceResult.disclaimers ?? undefined,
        replacementMessage: complianceResult.replacementMessage ?? undefined,
      },
      missingFieldsForResponse,
      prefillPacket,
      pitch,
      trace,
      suppressedFields
    )

    // Log final result structure for debugging
    await logDebug('Intake handler: Final result structure', {
      type: 'intake_result_built',
      hasRoute: !!result.route,
      routePrimaryCarrier: result.route?.primaryCarrier,
      routeEligibleCarriers: result.route?.eligibleCarriers,
      routeEligibleCarriersCount: result.route?.eligibleCarriers?.length || 0,
      routeConfidence: result.route?.confidence,
      routeRationale: result.route?.rationale,
      hasPrefill: !!result.prefill,
      prefillRoutingPrimaryCarrier: result.prefill?.routing?.primaryCarrier,
      prefillRoutingEligibleCarriers: result.prefill?.routing?.eligibleCarriers,
      prefillRoutingEligibleCarriersCount: result.prefill?.routing?.eligibleCarriers?.length || 0,
      resultKeys: Object.keys(result),
    })

    // Log the actual JSON that will be sent (first 500 chars to avoid huge logs)
    const resultJson = JSON.stringify(result)
    await logDebug('Intake handler: Response JSON preview', {
      type: 'intake_response_json',
      jsonLength: resultJson.length,
      jsonPreview: resultJson.substring(0, 500),
      hasRouteInJson: resultJson.includes('"route"'),
    })

    return c.json(result)
  } catch (error) {
    // Log error (error handler middleware will catch and format response)
    await logError('Intake endpoint error', error as Error, {
      type: 'intake_error',
    })

    // Re-throw to let error handler middleware handle it
    throw error
  }
}
