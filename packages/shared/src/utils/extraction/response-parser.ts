/**
 * Response Parser Utilities
 *
 * Utilities for parsing and separating LLM extraction responses into known vs inferred fields.
 */

import { CONFIDENCE_THRESHOLD_HIGH } from '../../constants/llm-config'
import type { UserProfile } from '../../schemas/user-profile'

/**
 * Result of separating known from inferred fields
 */
export interface SeparatedFields {
  known: Partial<UserProfile>
  inferred: Partial<UserProfile>
  reasons: Record<string, string>
}

/**
 * Separate extracted fields into known vs inferred based on confidence threshold
 *
 * @param validatedProfile - Validated profile from LLM extraction
 * @param confidence - Confidence scores for each field
 * @param threshold - Confidence threshold for known vs inferred (default: CONFIDENCE_THRESHOLD_HIGH)
 * @param reasoning - Optional reasoning text from LLM
 * @returns Separated known and inferred fields with reasons
 */
export function separateKnownFromInferred(
  validatedProfile: Partial<UserProfile>,
  confidence: Record<string, number>,
  threshold: number = CONFIDENCE_THRESHOLD_HIGH,
  reasoning?: string
): SeparatedFields {
  const known: Partial<UserProfile> = {}
  const inferred: Partial<UserProfile> = {}
  const reasons: Record<string, string> = {}

  for (const [fieldName, fieldValue] of Object.entries(validatedProfile)) {
    const fieldConfidence = confidence[fieldName] ?? 0

    if (fieldConfidence >= threshold) {
      // High confidence (≥threshold): treat as known
      // Type assertion needed because Object.entries loses type information
      ;(known as Record<string, unknown>)[fieldName] = fieldValue
    } else if (fieldConfidence > 0) {
      // Medium/low confidence (<threshold): treat as inferred
      // Type assertion needed because Object.entries loses type information
      ;(inferred as Record<string, unknown>)[fieldName] = fieldValue
      reasons[fieldName] =
        reasoning ?? `Extracted with ${(fieldConfidence * 100).toFixed(0)}% confidence`
    }
  }

  return { known, inferred, reasons }
}
