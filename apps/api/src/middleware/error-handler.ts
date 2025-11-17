import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logError } from '../utils/logger'

/**
 * Global Error Handler Middleware
 *
 * Catches all errors and transforms them into structured API error responses.
 * Logs errors to program log for debugging.
 *
 * @see docs/architecture/18-error-handling-strategy.md
 */

export async function errorHandler(c: Context, next: () => Promise<void>) {
  try {
    await next()
  } catch (error) {
    // Log error with context
    await logError('Request error', error as Error, {
      type: 'request_error',
      method: c.req.method,
      path: c.req.path,
      status: error instanceof HTTPException ? error.status : 500,
    })

    // Handle HTTPException (thrown by Hono)
    if (error instanceof HTTPException) {
      return c.json(
        {
          error: {
            code: getErrorCode(error.status),
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        },
        error.status
      )
    }

    // Handle unknown errors
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      500
    )
  }
}

/**
 * Map HTTP status codes to error codes
 */
function getErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR'
    case 404:
      return 'NOT_FOUND'
    case 500:
      return 'INTERNAL_ERROR'
    case 503:
      return 'LLM_API_ERROR'
    default:
      return 'INTERNAL_ERROR'
  }
}
