import { type UnifiedFieldMetadata, unifiedFieldMetadata } from './unified-field-metadata'

/**
 * Unified Field Metadata Utilities
 *
 * Utility functions for working with unified field metadata.
 * Separated from field definitions for better organization (SOLID, DRY).
 *
 * @see packages/shared/src/schemas/unified-field-metadata.ts
 */

// ============================================================================
// Unified Functions (work for any flow)
// ============================================================================

/**
 * Get field metadata by field name
 */
export function getUnifiedFieldMetadata(field: string): UnifiedFieldMetadata | undefined {
  return unifiedFieldMetadata[field]
}

/**
 * Get all fields for a specific flow
 */
export function getFieldsForFlow(flow: 'intake' | 'policy'): string[] {
  return Object.entries(unifiedFieldMetadata)
    .filter(([, metadata]) => metadata.flows.includes(flow))
    .map(([field]) => field)
}

/**
 * Get shortcut for a field (unified - works for any flow)
 */
export function getUnifiedFieldShortcut(field: string): string | undefined {
  return unifiedFieldMetadata[field]?.shortcut
}

/**
 * Get field name from shortcut (unified - works for any flow)
 */
export function getUnifiedFieldFromShortcut(
  shortcut: string,
  flow?: 'intake' | 'policy'
): string | undefined {
  for (const [field, metadata] of Object.entries(unifiedFieldMetadata)) {
    if (metadata.shortcut === shortcut) {
      // If flow specified, check if field applies to that flow
      if (flow && !metadata.flows.includes(flow)) {
        continue
      }
      return field
    }
  }
  return undefined
}

/**
 * Get field name from alias (unified - works for any flow)
 */
export function getUnifiedFieldFromAlias(
  alias: string,
  flow?: 'intake' | 'policy'
): string | undefined {
  for (const [field, metadata] of Object.entries(unifiedFieldMetadata)) {
    if (metadata.aliases?.includes(alias)) {
      // If flow specified, check if field applies to that flow
      if (flow && !metadata.flows.includes(flow)) {
        continue
      }
      return field
    }
    // Also check if alias matches field name
    if (field === alias) {
      if (flow && !metadata.flows.includes(flow)) {
        continue
      }
      return field
    }
  }
  return undefined
}

// ============================================================================
// Backward Compatibility: Intake-Only Field Metadata
// ============================================================================

/**
 * Legacy FieldMetadata interface (for backward compatibility)
 * @deprecated Use UnifiedFieldMetadata instead
 */
export interface FieldMetadata {
  shortcut: string
  label: string
  question: string
  category: string
  fieldType: 'string' | 'numeric' | 'date' | 'object' | 'boolean'
  aliases?: string[]
}

/**
 * Get intake-only field metadata (backward compatibility)
 * Filters unified metadata to only include intake fields
 */
export function getIntakeFieldMetadata(): Record<string, FieldMetadata> {
  const intakeFields: Record<string, FieldMetadata> = {}
  for (const [field, metadata] of Object.entries(unifiedFieldMetadata)) {
    if (metadata.flows.includes('intake')) {
      intakeFields[field] = {
        shortcut: metadata.shortcut,
        label: metadata.label,
        question: metadata.question,
        category: metadata.category,
        fieldType: metadata.fieldType === 'numeric' ? 'numeric' : 'string', // Legacy only supports these
        aliases: metadata.aliases,
      }
    }
  }
  return intakeFields
}

/**
 * Get intake-only field metadata map (backward compatibility)
 * @deprecated Use unifiedFieldMetadata with flow filtering instead
 */
export const userProfileFieldMetadata = getIntakeFieldMetadata()

/**
 * Get metadata for a specific intake field (backward compatibility)
 * @deprecated Use getUnifiedFieldMetadata instead
 */
export function getFieldMetadata(field: string): FieldMetadata | undefined {
  const metadata = unifiedFieldMetadata[field]
  if (!metadata || !metadata.flows.includes('intake')) {
    return undefined
  }
  return {
    shortcut: metadata.shortcut,
    label: metadata.label,
    question: metadata.question,
    category: metadata.category,
    fieldType: metadata.fieldType === 'numeric' ? 'numeric' : 'string',
    aliases: metadata.aliases,
  }
}

/**
 * Get all intake field names that have shortcuts (backward compatibility)
 * @deprecated Use getFieldsForFlow('intake') and filter by shortcut instead
 */
export function getFieldsWithShortcuts(): string[] {
  return Object.entries(unifiedFieldMetadata)
    .filter(([, metadata]) => metadata.flows.includes('intake') && metadata.shortcut !== '')
    .map(([field]) => field)
}

/**
 * Get shortcut key for an intake field (backward compatibility)
 * @deprecated Use getUnifiedFieldShortcut instead
 */
export function getFieldShortcut(field: string): string | undefined {
  const metadata = unifiedFieldMetadata[field]
  if (!metadata || !metadata.flows.includes('intake')) {
    return undefined
  }
  return metadata.shortcut || undefined
}

/**
 * Get intake field name from shortcut key (backward compatibility)
 * @deprecated Use getUnifiedFieldFromShortcut('intake', shortcut) instead
 */
export function getFieldFromShortcut(shortcut: string): string | undefined {
  return getUnifiedFieldFromShortcut(shortcut, 'intake')
}

/**
 * Get intake field name from alias (backward compatibility)
 * @deprecated Use getUnifiedFieldFromAlias(alias, 'intake') instead
 */
export function getFieldFromAlias(alias: string): string | undefined {
  return getUnifiedFieldFromAlias(alias, 'intake')
}
