/**
 * Shared Field Metadata
 *
 * Fields used in both intake and policy flows.
 * These fields have consistent metadata across both flows.
 */

import type { UnifiedFieldMetadata } from '../unified-field-metadata'
import { eligibilityFields } from './shared-fields/eligibility-fields'
import { householdFields } from './shared-fields/household-fields'
import { identityFields } from './shared-fields/identity-fields'
import { locationFields } from './shared-fields/location-fields'
import { productFields } from './shared-fields/product-fields'
import { propertyFields } from './shared-fields/property-fields'
import { vehicleFields } from './shared-fields/vehicle-fields'

/**
 * Combined shared fields from all categories
 */
export const sharedFields: Record<string, UnifiedFieldMetadata> = {
  ...identityFields,
  ...locationFields,
  ...householdFields,
  ...vehicleFields,
  ...propertyFields,
  ...eligibilityFields,
  ...productFields,
}
