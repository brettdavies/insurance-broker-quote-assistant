import { Hono } from 'hono'
import { z } from 'zod'
import {
  complianceLogger,
  logDebug,
  logError,
  logInfo,
  logWarn,
  productionLogger,
} from '../utils/logger'

/**
 * Log Route
 *
 * POST /api/log endpoint for receiving logs from frontend.
 * Routes logs to appropriate logger (production or compliance) based on log type.
 */

// Log entry schema
const logEntrySchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(), // ISO timestamp (optional, will use current time if not provided)
  type: z.enum(['product', 'compliance']).optional().default('product'), // Log type: product or compliance
})

type LogEntry = z.infer<typeof logEntrySchema>

// Request body schema (can contain single log or array of logs)
const logRequestSchema = z.object({
  logs: z.array(logEntrySchema).or(logEntrySchema), // Accept single log or array
})

type LogRequest = z.infer<typeof logRequestSchema>

/**
 * Create log route handler
 *
 * @returns Hono route handler
 */
export function createLogRoute() {
  const app = new Hono()

  app.post('/api/log', async (c) => {
    try {
      // Parse and validate request body
      const body = await c.req.json()
      const validationResult = logRequestSchema.safeParse(body)

      if (!validationResult.success) {
        return c.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid log request body',
              details: validationResult.error.errors,
            },
          },
          400
        )
      }

      const { logs } = validationResult.data

      // Normalize to array
      const logEntries: LogEntry[] = Array.isArray(logs) ? logs : [logs]

      // Process each log entry
      for (const entry of logEntries) {
        const { level, message, data, type } = entry

        // Route to appropriate logger based on type
        const logger = type === 'compliance' ? complianceLogger : productionLogger

        // Call appropriate logger method based on level
        switch (level) {
          case 'debug':
            await logger.logDebug(message, data)
            break
          case 'info':
            await logger.logInfo(message, data)
            break
          case 'warn':
            await logger.logWarn(message, data)
            break
          case 'error': {
            // For errors, extract error object if present in data
            const error = data?.error instanceof Error ? data.error : new Error(message)
            await logger.logError(message, error, data)
            break
          }
        }
      }

      return c.json({ success: true, processed: logEntries.length }, 200)
    } catch (error) {
      // Log error (but don't fail the request - logging should be fire-and-forget)
      await logError('Log endpoint error', error as Error, {
        type: 'log_endpoint_error',
      })

      // Return success even on error (don't break frontend if logging fails)
      return c.json({ success: false, error: 'Failed to process logs' }, 500)
    }
  })

  return app
}
