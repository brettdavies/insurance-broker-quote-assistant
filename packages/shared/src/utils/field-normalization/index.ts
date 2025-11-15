/**
 * Field Normalization Index
 *
 * Main export file for all field normalization utilities.
 * Provides a unified interface for extracting and normalizing fields from natural language text.
 */

// Export types
export type { NormalizedField } from './types'

// Export normalizers
export { STATE_NAME_TO_CODE, normalizeState, extractStateFromText } from './normalizers'
export { CARRIER_NORMALIZATIONS, normalizeCarrierName } from './normalizers'

// Export extractors
export {
  extractState,
  extractDrivers,
  extractVehicles,
  extractKids,
  extractHouseholdSize,
  extractAge,
  extractOwnsHome,
  extractCleanRecord,
  extractZip,
  extractCurrentCarrier,
  extractProductType,
  extractNormalizedFields,
} from './extractors'

// Export inference utilities
export { inferExistingPolicies } from './inference'

// Export utility functions
/**
 * Convert normalized field to key-value format for pill creation
 * Returns format like "householdSize:2" that can be parsed by key-value parser
 */
export function normalizedFieldToKeyValue(field: import('./types').NormalizedField): string {
  return `${field.fieldName}:${field.value}`
}

// Export field name normalization
export { normalizeFieldName } from './normalize-field-name'
