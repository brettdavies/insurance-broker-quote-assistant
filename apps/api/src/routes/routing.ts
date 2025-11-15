/**
 * Routing Route
 *
 * POST /api/routing endpoint for fetching routing decisions based on profile.
 * Single Responsibility: Routing decision endpoint only
 */

import { userProfileSchema } from '@repo/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import { getRouteDecision } from '../services/routing-loader'
import { logDebug, logInfo } from '../utils/logger'

/**
 * Create routing route handler
 *
 * @returns Hono route handler
 */
export function createRoutingRoute() {
  const app = new Hono()

  app.post('/api/routing', async (c) => {
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

      // Log received profile for debugging
      await logInfo('Routing endpoint: Request received', {
        type: 'routing_request',
        profileState: profile.state,
        profileProductType: profile.productType,
        profileAge: profile.age,
        profileKeys: Object.keys(profile),
      })

      // Get route decision from routing loader
      const routeDecision = getRouteDecision(profile)

      return c.json({
        route: routeDecision,
      })
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'ROUTING_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get routing',
          },
        },
        500
      )
    }
  })

  return app
}
