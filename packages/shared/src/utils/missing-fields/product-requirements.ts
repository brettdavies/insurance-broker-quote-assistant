/**
 * Product Requirements
 *
 * Default product-specific field requirements.
 * Frontend uses these for real-time calculation.
 * Backend uses knowledge pack for carrier/state-specific requirements.
 */

import type { MissingField } from '../../schemas/missing-field'

/**
 * Product-specific field requirements
 *
 * Maps product type to array of required fields with priorities.
 * This is the default/fallback structure. Backend may override with
 * knowledge pack data for carrier/state-specific requirements.
 */
export const PRODUCT_REQUIREMENTS: Record<
  string,
  Array<{ field: string; priority: 'critical' | 'important' | 'optional' }>
> = {
  auto: [
    { field: 'vehicles', priority: 'critical' },
    { field: 'drivers', priority: 'critical' },
    { field: 'vins', priority: 'important' },
    { field: 'garage', priority: 'optional' },
  ],
  home: [
    { field: 'propertyType', priority: 'critical' },
    { field: 'yearBuilt', priority: 'important' },
    { field: 'squareFeet', priority: 'important' },
    { field: 'roofType', priority: 'optional' },
  ],
  renters: [{ field: 'propertyType', priority: 'critical' }],
  umbrella: [{ field: 'existingPolicies', priority: 'critical' }],
} as const

/**
 * Get default product requirements
 *
 * @param productType - Product type (e.g., 'auto', 'home', 'renters', 'umbrella')
 * @returns Array of field requirements for the product, or empty array if product not found
 */
export function getDefaultProductRequirements(productType: string): MissingField[] {
  return PRODUCT_REQUIREMENTS[productType] || []
}
