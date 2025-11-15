import { userProfileSchema } from '@repo/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import type { ConversationalExtractor } from '../services/conversational-extractor'
import { handleIntake } from './intake/handlers/intake-handler'

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

    return handleIntake(c, extractor, message, pills, suppressedFields, testPitch)
  })

  // Note: Generate prefill endpoint moved to main app at /api/generate-prefill
  // This allows Hono RPC client to work properly (nested routes not well supported)

  return app
}
