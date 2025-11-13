import type { PolicySummary } from './policy-summary'
import type { UserProfile } from './user-profile'

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
  aliases?: string[] // Optional aliases for field name (e.g., ['product'] for productLine)
  flows: ('intake' | 'policy')[] // Which flows this field applies to
  nestedFields?: Record<string, UnifiedFieldMetadata> // For nested objects (coverageLimits, deductibles, etc.)
  min?: number // Minimum value for numeric fields
  max?: number // Maximum value for numeric fields
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
