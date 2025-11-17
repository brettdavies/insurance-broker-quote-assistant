/**
 * Inference Setup Handler
 *
 * Sets up and initializes the InferenceEngine for intake processing.
 */

import type { InferenceRule, UserProfile } from '@repo/shared'
import { InferenceEngine, TEXT_PATTERN_INFERENCES, unifiedFieldMetadata } from '@repo/shared'

/**
 * Setup inference engine with field inferences and suppression list
 */
export function setupInferenceEngine(
  knownFields: Partial<UserProfile>,
  message: string,
  suppressedFields?: string[]
): {
  inferenceEngine: InferenceEngine
  inferredFields: Partial<UserProfile>
} {
  // Extract field-to-field inference rules from unified field metadata
  const fieldInferences: Record<string, InferenceRule[]> = {}
  for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
    if (metadata.infers) {
      fieldInferences[fieldName] = metadata.infers
    }
  }

  // Initialize InferenceEngine with field inferences, text patterns, and suppression list
  const inferenceEngine = new InferenceEngine(
    fieldInferences,
    TEXT_PATTERN_INFERENCES,
    suppressedFields || []
  )

  // Apply deterministic inference rules to known fields and message text
  // This pre-populates inferred fields before LLM extraction, improving efficiency
  const inferenceResult = inferenceEngine.applyInferences(knownFields, message)
  const inferredFields = inferenceResult.inferred

  return {
    inferenceEngine,
    inferredFields,
  }
}
