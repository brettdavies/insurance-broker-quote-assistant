/**
 * Conversational Prompts Utilities
 *
 * Shared utilities for building conversational extraction prompts.
 * These are pure functions that take template content and inject variables.
 * File I/O for loading templates should be handled by the backend.
 */

import { unifiedFieldMetadata } from '../../schemas/unified-field-metadata'
import type { UserProfile } from '../../schemas/user-profile'

/**
 * Build system prompt with known/inferred/suppressed fields injected
 *
 * @param template - System prompt template content
 * @param knownFields - Known fields explicitly set by broker (read-only for LLM)
 * @param inferredFields - Inferred fields from InferenceEngine (modifiable by LLM)
 * @param suppressedFields - Array of field names to skip during inference
 * @returns Built system prompt with variables replaced
 */
export function buildSystemPrompt(
  template: string,
  knownFields: Partial<UserProfile>,
  inferredFields: Partial<UserProfile>,
  suppressedFields: string[]
): string {
  return template
    .replace('{{knownFields}}', JSON.stringify(knownFields))
    .replace('{{inferredFields}}', JSON.stringify(inferredFields))
    .replace('{{suppressedFields}}', suppressedFields.join(', '))
}

/**
 * Extract enum values from unified field metadata for fields that have them
 *
 * @param carrierNames - Optional array of carrier names from knowledge pack
 * @returns Formatted string with enum values in a dedicated section
 */
function getEnumValuesText(carrierNames?: string[]): string {
  const enumFields: Array<{ fieldName: string; label: string; options: string[] }> = []

  for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
    // Only include fields that are used in intake flow
    if (metadata.flows.includes('intake') && metadata.options && metadata.options.length > 0) {
      enumFields.push({
        fieldName,
        label: metadata.label,
        options: metadata.options,
      })
    }
  }

  // Add carriers if provided (dynamic from knowledge pack)
  if (carrierNames && carrierNames.length > 0) {
    // Get currentCarrier metadata to use its label
    const currentCarrierMetadata = unifiedFieldMetadata.currentCarrier
    if (currentCarrierMetadata) {
      enumFields.push({
        fieldName: 'currentCarrier',
        label: currentCarrierMetadata.label,
        options: carrierNames,
      })
    }
  }

  if (enumFields.length === 0) {
    return ''
  }

  // Sort by field name for consistent output
  enumFields.sort((a, b) => a.fieldName.localeCompare(b.fieldName))

  // Format as a dedicated section with "Valid X include: ..." format
  const lines = enumFields.map(({ fieldName, label, options }) => {
    const optionsList = options.map((opt) => `"${opt}"`).join(', ')
    // Use label if available, otherwise use fieldName
    let displayName = label || fieldName
    displayName = displayName.toLowerCase()
    // Make plural if it ends with "type" or is a single word that should be plural
    if (displayName.endsWith(' type')) {
      displayName = displayName.replace(' type', ' types')
    } else if (displayName === 'state') {
      displayName = 'states'
    } else if (displayName === 'current carrier') {
      displayName = 'carriers'
    }
    return `Valid ${displayName} include: ${optionsList}`
  })

  return lines.join('\n')
}

/**
 * Build user prompt with known/inferred/suppressed fields injected
 *
 * @param template - User prompt template content
 * @param message - Current broker message (cleaned text without pills)
 * @param knownFields - Known fields explicitly set by broker (read-only for LLM)
 * @param inferredFields - Inferred fields from InferenceEngine (modifiable by LLM)
 * @param suppressedFields - Array of field names to skip during inference
 * @param carrierNames - Optional array of carrier names from knowledge pack (for dynamic enum values)
 * @returns Built user prompt with variables replaced
 */
export function buildUserPrompt(
  template: string,
  message: string,
  knownFields: Partial<UserProfile>,
  inferredFields: Partial<UserProfile>,
  suppressedFields: string[],
  carrierNames?: string[]
): string {
  const enumValuesText = getEnumValuesText(carrierNames)

  return template
    .replace('{{knownFields}}', JSON.stringify(knownFields, null, 2))
    .replace('{{inferredFields}}', JSON.stringify(inferredFields, null, 2))
    .replace('{{suppressedFields}}', suppressedFields.join(', '))
    .replace('{{message}}', message)
    .replace('{{enumValues}}', enumValuesText)
}
