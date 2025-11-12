/**
 * Response Parser
 *
 * Handles parsing and validation of Gemini API responses.
 * Single Responsibility: Response parsing and validation
 */

import type { UserProfile } from '@repo/shared'
import type { ZodSchema } from 'zod'

export interface ParsedResponse<T> {
  data: T
  responseText: string
}

/**
 * Parse JSON response from Gemini API
 */
export function parseJsonResponse<T>(response: unknown): ParsedResponse<T> {
  const responseText = (response as { text?: string }).text
  if (!responseText) {
    throw new Error('Empty response from Gemini API')
  }

  try {
    const data = JSON.parse(responseText) as T
    return { data, responseText }
  } catch (parseError) {
    throw new Error(`Failed to parse JSON response: ${parseError}`)
  }
}

/**
 * Validate parsed data against Zod schema
 */
export function validateResponse<T>(parsedData: Partial<T>, schema: ZodSchema): Partial<T> {
  return schema.parse(parsedData) as Partial<T>
}

/**
 * Calculate confidence scores for extracted fields
 */
export function calculateConfidence(fields: Record<string, unknown>): Record<string, number> {
  const confidence: Record<string, number> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      confidence[key] = 0.8 // Default confidence for LLM extraction
    } else {
      confidence[key] = 0.0
    }
  }
  return confidence
}
