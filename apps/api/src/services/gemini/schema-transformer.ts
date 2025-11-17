/**
 * Schema Transformer
 *
 * Handles transformation of Zod JSON schemas for Gemini API compatibility.
 * Single Responsibility: Schema transformation orchestration
 */

import { fixExclusiveMinimumForGemini } from './schema-transformer/exclusive-minimum-fixer'
import { removeFormatConstraints } from './schema-transformer/format-remover'
import { enhanceSchemaWithNullAndDescriptions } from './schema-transformer/null-enhancer'
import { removeRequiredArrays } from './schema-transformer/required-remover'

// Re-export individual transformers for direct use if needed
export { fixExclusiveMinimumForGemini } from './schema-transformer/exclusive-minimum-fixer'
export { removeRequiredArrays } from './schema-transformer/required-remover'
export { removeFormatConstraints } from './schema-transformer/format-remover'
export { enhanceSchemaWithNullAndDescriptions } from './schema-transformer/null-enhancer'

/**
 * Transform schema for Gemini API compatibility
 * Applies all transformations:
 * 1. Remove all required arrays (set to empty array)
 * 2. Fix exclusiveMinimum -> minimum conversion (use metadata min/max when available)
 * 3. Remove format constraints (especially email)
 * 4. Enhance with null types and descriptions
 */
export function transformSchemaForGemini(schema: Record<string, unknown>): Record<string, unknown> {
  // Step 1: Remove all required arrays first
  let transformed = removeRequiredArrays(schema)

  // Step 2: Fix exclusiveMinimum and apply metadata min/max
  transformed = fixExclusiveMinimumForGemini(transformed)

  // Step 3: Remove format constraints
  transformed = removeFormatConstraints(transformed)

  // Step 4: Enhance with null types and descriptions
  transformed = enhanceSchemaWithNullAndDescriptions(transformed)

  return transformed
}
