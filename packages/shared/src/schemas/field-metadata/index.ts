import type { UnifiedFieldMetadata } from '../unified-field-metadata'
import { intakeFields } from './intake-fields'
import { policyFields } from './policy-fields'
import { sharedFields } from './shared-fields'

/**
 * Unified Field Metadata
 *
 * Combines shared, intake-only, and policy-only fields into a single metadata system.
 * Re-exports the UnifiedFieldMetadata type and provides the combined metadata map.
 */

export type { UnifiedFieldMetadata } from '../unified-field-metadata'

/**
 * Unified Field Metadata Map
 *
 * Combines UserProfile and PolicySummary fields into a single metadata system.
 * Shared fields (name, state, etc.) use the same metadata for both flows.
 */
export const unifiedFieldMetadata: Record<string, UnifiedFieldMetadata> = {
  ...sharedFields,
  ...intakeFields,
  ...policyFields,
}
