/**
 * Product Queries
 *
 * Query functions for product-related data from the knowledge pack.
 */

import { getProduct } from '../knowledge-pack-loader'

/**
 * Get a product by code
 *
 * @param code - Product code (e.g., "auto", "home", "renters", "umbrella")
 * @returns Product object or undefined if not found
 */
export function getProductByCode(code: string) {
  return getProduct(code)
}

/**
 * Get product-level field requirements
 *
 * Returns base required fields for a product type (e.g., auto requires vehicles, drivers).
 * These are product-level requirements that apply regardless of carrier or state.
 *
 * @param productType - Product type ('auto', 'home', 'renters', 'umbrella')
 * @returns Array of required field keys with priority
 */
export function getProductFieldRequirements(
  productType: string
): Array<{ field: string; priority: 'critical' | 'important' | 'optional' }> {
  const product = getProduct(productType)
  if (!product || !product.requiredFields) {
    return []
  }

  const requiredFields = product.requiredFields.value
  if (!Array.isArray(requiredFields)) {
    return []
  }

  return requiredFields
}
