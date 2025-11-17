/**
 * Prefill Route
 *
 * POST /api/generate-prefill endpoint for generating prefill packets.
 * Single Responsibility: Prefill generation endpoint only
 */

import type { PrefillPacket, RouteDecision, UserProfile } from '@repo/shared'
import { prefillPacketSchema, userProfileSchema } from '@repo/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import { validateOutput } from '../services/compliance-filter'
import { generatePrefillPacket, getMissingFields } from '../services/prefill-generator'
import { routeToCarrier } from '../services/routing-engine'
import { createDecisionTrace, logDecisionTrace } from '../utils/decision-trace'
import { logDebug, logError } from '../utils/logger'

/**
 * Create prefill generation route
 *
 * @returns Hono route with prefill generation endpoint
 */
export function createPrefillRoute(): Hono {
  const route = new Hono()

  route.post('/api/generate-prefill', async (c) => {
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

      // Log prefill request for debugging
      await logDebug('Prefill endpoint: Request received', {
        type: 'prefill_request',
        profileState: profile.state,
        profileProductType: profile.productType,
        profileKeys: Object.keys(profile),
      })

      // Call routing engine to get RouteDecision (if not already available)
      let routeDecision: RouteDecision
      try {
        routeDecision = routeToCarrier(profile)

        // Log routing result
        await logDebug('Prefill endpoint: Routing complete', {
          type: 'prefill_routing_complete',
          primaryCarrier: routeDecision.primaryCarrier,
          eligibleCarriers: routeDecision.eligibleCarriers,
          eligibleCarriersCount: routeDecision.eligibleCarriers.length,
          confidence: routeDecision.confidence,
        })
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
          profile.productType || undefined
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
        prefillPacket = await generatePrefillPacket(
          profile,
          routeDecision,
          missingFields,
          disclaimers
        )

        // Log prefill packet routing data
        await logDebug('Prefill endpoint: Prefill packet generated', {
          type: 'prefill_packet_generated',
          hasRouting: !!prefillPacket.routing,
          routingPrimaryCarrier: prefillPacket.routing?.primaryCarrier,
          routingEligibleCarriers: prefillPacket.routing?.eligibleCarriers,
          routingEligibleCarriersCount: prefillPacket.routing?.eligibleCarriers?.length || 0,
          routingConfidence: prefillPacket.routing?.confidence,
        })
      } catch (error) {
        // Handle prefill generation errors gracefully
        await logError('Prefill generation error', error as Error, {
          type: 'prefill_error',
        })
        // Return proper error response instead of throwing
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to generate prefill packet'
        return c.json(
          {
            error: {
              code: 'PREFILL_GENERATION_ERROR',
              message: errorMessage,
              timestamp: new Date().toISOString(),
            },
          },
          400
        )
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
        'prefill_generation',
        {
          profile: {
            state: profile.state,
            productType: profile.productType,
            name: profile.name,
          },
        },
        {
          method: 'prefill_generator',
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
          productType: profile.productType || undefined,
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

  return route
}
