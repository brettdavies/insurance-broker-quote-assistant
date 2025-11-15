import type { PolicySummary } from './policy-summary'
import type { UserProfile } from './user-profile'

/**
 * Inference Rule for Field-to-Field Inferences
 *
 * Defines how one field's value can deterministically infer another field's value.
 * Used by the InferenceEngine to derive additional fields from known fields.
 *
 * **Architecture Context:**
 * Part of the "known vs inferred pills" architecture (Epic 4: Field Extraction Bulletproofing).
 * Field-to-field inferences complement text pattern inferences to improve extraction accuracy.
 *
 * **Usage Example:**
 * ```typescript
 * // productType field has inference rule for ownsHome
 * {
 *   targetField: 'ownsHome',
 *   inferValue: (productType) => {
 *     if (productType === 'renters') return false  // Renters don't own
 *     if (productType === 'home') return true       // Home insurance requires ownership
 *     return undefined                              // No inference for other products
 *   },
 *   confidence: 'high',
 *   reasoning: 'Renters insurance implies tenant status; home insurance implies ownership'
 * }
 * ```
 *
 * @see packages/shared/src/config/text-pattern-inferences.ts - Text pattern inferences
 * @see docs/architecture/field-extraction-bulletproofing.md - Architecture documentation
 */
export interface InferenceRule {
  /**
   * Target field name to infer (must match field name in UserProfile or PolicySummary).
   * @example 'ownsHome', 'householdSize', 'cleanRecord3Yr'
   */
  targetField: string

  /**
   * Function to compute inferred value from source field value.
   * Return `undefined` if no inference can be made for the given source value.
   *
   * @param sourceValue - The value of the source field (field containing this inference rule)
   * @returns Inferred value for target field, or undefined if no inference possible
   *
   * @example (productType) => productType === 'renters' ? false : undefined
   */
  // biome-ignore lint/suspicious/noExplicitAny: Generic inference function must accept any field type (string, number, boolean)
  inferValue: (sourceValue: any) => any

  /**
   * Confidence level for this inference.
   * Affects UI display (high = bold, medium = normal, low = italic).
   */
  confidence: 'high' | 'medium' | 'low'

  /**
   * Human-readable explanation of why this inference is made.
   * Shown in UI tooltip to help broker understand inference logic.
   *
   * @example "Renters insurance implies tenant status; home insurance implies ownership"
   */
  reasoning: string
}

/**
 * Unified Field Metadata Schema
 *
 * Single source of truth for all field metadata across both intake and policy flows.
 * Ensures shared fields (e.g., name, state) use the same metadata regardless of flow.
 *
 * @see packages/shared/src/schemas/user-profile.ts
 * @see packages/shared/src/schemas/policy-summary.ts
 */

export interface UnifiedFieldMetadata {
  shortcut: string // Single character keyboard shortcut (e.g., 'n' for name)
  label: string // Display label
  question: string // Question prompt for conversational intake (optional for policy-only fields)
  description?: string // Concise field description for LLM schema (e.g., "Age in years" instead of "What is the age?")
  category: string // Category for grouping in UI
  fieldType: 'string' | 'numeric' | 'date' | 'object' | 'boolean' // Field type for validation/input
  aliases?: string[] // Optional aliases for field name (e.g., ['product'] for productType)
  flows: ('intake' | 'policy')[] // Which flows this field applies to
  nestedFields?: Record<string, UnifiedFieldMetadata> // For nested objects (coverageLimits, deductibles, etc.)
  min?: number // Minimum value for numeric fields
  max?: number // Maximum value for numeric fields
  infers?: InferenceRule[] // Optional field-to-field inference rules (part of known vs inferred pills architecture)
  singleInstance?: boolean // If true, field can only have one value (duplicates should update existing, not create new)
  options?: string[] // Optional enum options for dropdown selection (if provided, field must use dropdown, not free text)
}

/**
 * Unified Field Metadata Map
 *
 * Re-exported from field-metadata/index.ts for backward compatibility.
 * Field definitions are now organized in domain-specific files:
 * - field-metadata/shared-fields.ts - Fields used in both flows
 * - field-metadata/intake-fields.ts - Intake-only fields
 * - field-metadata/policy-fields.ts - Policy-only fields
 *
 * @see packages/shared/src/schemas/field-metadata/index.ts
 */
export { unifiedFieldMetadata } from './field-metadata/index'
