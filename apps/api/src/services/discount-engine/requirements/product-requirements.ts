/**
 * Product Requirement Checkers
 *
 * Validates product-related discount requirements
 */

import type { PolicySummary, UserProfile } from '@repo/shared'
import type { DiscountRequirements } from '../types'

/**
 * Get all products from policy and existing policies
 *
 * @param policy - Policy summary
 * @param customerData - Optional customer profile data
 * @returns Array of product types
 */
function getAllProducts(
  policy: PolicySummary,
  customerData?: UserProfile
): Array<'auto' | 'home' | 'renters' | 'umbrella'> {
  const policyProducts = policy.productType ? [policy.productType] : []
  const existingProducts =
    customerData?.existingPolicies?.map((p) => p.product) || []
  return [...policyProducts, ...existingProducts]
}

/**
 * Check if mustHaveProducts requirement is met
 *
 * @param requirements - Discount requirements
 * @param policy - Policy summary
 * @param customerData - Optional customer profile data
 * @returns Missing products if requirement not met, empty array if met
 */
export function checkMustHaveProducts(
  requirements: DiscountRequirements,
  policy: PolicySummary,
  customerData?: UserProfile
): string[] {
  if (!requirements.mustHaveProducts) {
    return []
  }

  const allProducts = getAllProducts(policy, customerData)
  const hasAllProducts = requirements.mustHaveProducts.every((product) =>
    allProducts.includes(product as 'auto' | 'home' | 'renters' | 'umbrella')
  )

  if (!hasAllProducts) {
    return [
      `Missing required products: ${requirements.mustHaveProducts.join(', ')}`,
    ]
  }

  return []
}

/**
 * Check if minProducts requirement is met
 *
 * @param requirements - Discount requirements
 * @param policy - Policy summary
 * @param customerData - Optional customer profile data
 * @returns Missing requirement message if not met, empty array if met
 */
export function checkMinProducts(
  requirements: DiscountRequirements,
  policy: PolicySummary,
  customerData?: UserProfile
): string[] {
  if (!requirements.minProducts) {
    return []
  }

  const allProducts = getAllProducts(policy, customerData)
  const totalProducts = allProducts.length

  if (totalProducts < requirements.minProducts) {
    return [
      `Need at least ${requirements.minProducts} products (currently have ${totalProducts})`,
    ]
  }

  return []
}

/**
 * Check all product requirements
 *
 * @param requirements - Discount requirements
 * @param policy - Policy summary
 * @param customerData - Optional customer profile data
 * @returns Array of missing requirement messages
 */
export function checkProductRequirements(
  requirements: DiscountRequirements,
  policy: PolicySummary,
  customerData?: UserProfile
): string[] {
  const missing: string[] = []
  missing.push(...checkMustHaveProducts(requirements, policy, customerData))
  missing.push(...checkMinProducts(requirements, policy, customerData))
  return missing
}

