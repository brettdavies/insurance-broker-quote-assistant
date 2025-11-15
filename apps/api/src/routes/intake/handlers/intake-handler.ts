/**
 * Intake Handler
 *
 * Main handler for the /api/intake endpoint.
 */

import type { PrefillPacket, RouteDecision } from '@repo/shared'
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
  pills: Record<string, unknown> | undefined,
  suppressedFields: string[] | undefined,
  testPitch: string | undefined
): Promise<Response> {
  try {
    // Pills are now treated as knownFields (broker-curated, read-only for LLM)
    const knownFields = pills || {}

    // Setup inference engine and apply inferences
    const { inferredFields } = setupInferenceEngine(knownFields, message, suppressedFields)

    // Extract fields using Conversational Extractor
    // Pass knownFields (pills), inferredFields, and suppressedFields
    const extractionResult = await extractor.extractFields(
      message,
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
            rulesEvaluated: routeDecision.citations.map((c: { file: string }) => c.file),
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
      complianceResult,
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
