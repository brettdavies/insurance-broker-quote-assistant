/**
 * Middleware Setup
 *
 * Configures and registers middleware for the Hono app.
 * Single Responsibility: Middleware registration only
 */

import type { Hono } from 'hono'
import { cors } from 'hono/cors'
import { errorHandler } from './error-handler'

/**
 * Setup middleware on the Hono app
 *
 * @param app - Hono app instance
 */
export function setupMiddleware(app: Hono): void {
  // CORS middleware (allows frontend to call API)
  app.use(
    '*',
    cors({
      origin: [
        'http://localhost:3000', // Dev & Eval frontend
        'http://localhost:5173', // Vite fallback
      ],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  )

  // Global error handler middleware (must be after CORS)
  app.use('*', errorHandler)
}
