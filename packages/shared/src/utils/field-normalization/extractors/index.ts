/**
 * Field Extractors
 *
 * Barrel export for all field extraction modules.
 * These extractors parse broker notes text and identify structured field values.
 */

// State extraction
export { extractState, extractStateFromText } from './state-extractor'

// Numeric field extraction
export {
  extractAge,
  extractDrivers,
  extractHouseholdSize,
  extractKids,
  extractVehicles,
} from './numeric-extractors'

// Boolean field extraction
export { extractCleanRecord, extractOwnsHome } from './boolean-extractors'

// Text field extraction
export { CARRIER_NORMALIZATIONS, extractCurrentCarrier, extractZip } from './text-extractors'

// Product type extraction
export { extractProductType } from './product-type-extractor'

// Batch extraction
export { extractNormalizedFields } from './batch-extractor'
