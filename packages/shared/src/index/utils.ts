/**
 * Utility Exports
 *
 * All utility function exports from the shared package.
 */

// Export field normalization utilities
export {
  STATE_NAME_TO_CODE,
  CARRIER_NORMALIZATIONS,
  normalizeState,
  normalizeCarrierName,
  extractStateFromText,
  extractState,
  extractProductType,
  extractVehicles,
  extractDrivers,
  extractKids,
  extractHouseholdSize,
  extractOwnsHome,
  extractZip,
  extractAge,
  extractCurrentCarrier,
  extractCleanRecord,
  extractNormalizedFields,
  inferHouseholdSize,
  inferExistingPolicies,
  normalizedFieldToKeyValue,
  type NormalizedField,
} from '../utils/field-normalization'
