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

// Export field value normalizer utilities
export {
  normalizeStateValue,
  normalizeProductTypeValue,
  normalizeFieldValue,
} from '../utils/pill-parsing/field-value-normalizer'

// Export missing fields utilities
export {
  REQUIRED_FIELDS,
  checkRequiredFields,
  PRODUCT_REQUIREMENTS,
  getDefaultProductRequirements,
  isFieldMissing,
  checkFieldsAgainstRequirements,
} from '../utils/missing-fields'
