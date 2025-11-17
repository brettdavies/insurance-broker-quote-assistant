/**
 * Disclaimers Route
 *
 * GET /api/disclaimers endpoint for fetching disclaimers based on state and product.
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { getDisclaimers } from '../services/disclaimers-loader'

/**
 * Create disclaimers route handler
 *
 * @returns Hono route handler
 */
export function createDisclaimersRoute() {
  const app = new Hono()

  app.get('/api/disclaimers', async (c) => {
    try {
      // Parse query parameters
      const state = c.req.query('state')
      const productType = c.req.query('productType')

      // Get disclaimers from knowledge pack
      const disclaimers = getDisclaimers(state, productType)

      return c.json({
        disclaimers,
        state: state || undefined,
        productType: productType || undefined,
      })
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'DISCLAIMERS_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get disclaimers',
          },
        },
        500
      )
    }
  })

  return app
}
