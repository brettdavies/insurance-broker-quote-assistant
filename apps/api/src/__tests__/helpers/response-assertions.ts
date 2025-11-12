/**
 * Response Assertions
 *
 * Helper functions for asserting API response structure and content.
 * Uses Bun's expect() with convenient wrappers.
 */

import { expect } from 'bun:test'
import type { IntakeResult } from '@repo/shared'

/**
 * Assert successful response (200 status)
 */
export function expectSuccessResponse(response: Response): void {
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('application/json')
}

/**
 * Assert error response (4xx or 5xx status)
 */
export function expectErrorResponse(response: Response, expectedStatus?: number): void {
  if (expectedStatus !== undefined) {
    expect(response.status).toBe(expectedStatus)
  } else {
    expect(response.status).toBeGreaterThanOrEqual(400)
  }
  expect(response.headers.get('content-type')).toContain('application/json')
}

/**
 * Assert IntakeResult structure
 */
export function expectIntakeResult(body: unknown): asserts body is IntakeResult {
  expect(body).toBeDefined()
  expect(typeof body).toBe('object')

  const result = body as Record<string, unknown>

  // Required fields
  expect(result.profile).toBeDefined()
  expect(typeof result.profile).toBe('object')
  expect(result.missingFields).toBeDefined()
  expect(Array.isArray(result.missingFields)).toBe(true)

  // Optional fields (if present, validate structure)
  if (result.extractionMethod !== undefined) {
    expect(['key-value', 'llm']).toContain(result.extractionMethod)
  }

  if (result.confidence !== undefined) {
    expect(typeof result.confidence).toBe('object')
    const confidence = result.confidence as Record<string, unknown>
    for (const [key, value] of Object.entries(confidence)) {
      expect(typeof value).toBe('number')
      expect(value as number).toBeGreaterThanOrEqual(0)
      expect(value as number).toBeLessThanOrEqual(1)
    }
  }

  if (result.route !== undefined) {
    expect(typeof result.route).toBe('object')
    const route = result.route as Record<string, unknown>
    if (route.primaryCarrier !== undefined) {
      expect(typeof route.primaryCarrier).toBe('string')
    }
    if (route.eligibleCarriers !== undefined) {
      expect(Array.isArray(route.eligibleCarriers)).toBe(true)
    }
    if (route.confidence !== undefined) {
      expect(typeof route.confidence).toBe('number')
      expect(route.confidence as number).toBeGreaterThanOrEqual(0)
      expect(route.confidence as number).toBeLessThanOrEqual(1)
    }
  }

  if (result.complianceValidated !== undefined) {
    expect(typeof result.complianceValidated).toBe('boolean')
  }
}

/**
 * Assert error response body structure
 */
export function expectErrorBody(body: unknown, expectedCode?: string): void {
  expect(body).toBeDefined()
  expect(typeof body).toBe('object')

  const errorBody = body as Record<string, unknown>
  expect(errorBody.error).toBeDefined()

  const error = errorBody.error as Record<string, unknown>
  if (expectedCode !== undefined) {
    expect(error.code).toBe(expectedCode)
  }

  if (error.message !== undefined) {
    expect(typeof error.message).toBe('string')
  }
}

/**
 * Assert response has specific field in profile
 */
export function expectProfileField(
  body: unknown,
  field: string,
  expectedValue?: unknown
): void {
  const result = body as { profile?: Record<string, unknown> }
  expect(result.profile).toBeDefined()
  expect(result.profile?.[field]).toBeDefined()

  if (expectedValue !== undefined) {
    expect(result.profile?.[field]).toBe(expectedValue)
  }
}

/**
 * Assert response has specific missing field
 */
export function expectMissingField(body: unknown, fieldName: string): void {
  const result = body as { missingFields?: Array<{ field: string }> }
  expect(result.missingFields).toBeDefined()
  expect(Array.isArray(result.missingFields)).toBe(true)
  expect(result.missingFields?.some((f) => f.field === fieldName)).toBe(true)
}
