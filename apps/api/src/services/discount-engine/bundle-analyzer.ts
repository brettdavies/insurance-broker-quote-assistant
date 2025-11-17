/**
 * Bundle Analyzer
 *
 * Analyzes bundle opportunities for adding additional products
 */

import type { BundleOption, Carrier, PolicySummary, UserProfile } from '@repo/shared'
import { getFieldValue } from '../../utils/field-helpers'
import * as knowledgePackRAG from '../knowledge-pack-rag'
import type { DiscountRequirements } from './types'
import { createCitation } from './utils/citation'
import { getEffectivePercentage } from './utils/percentage'

/**
 * Analyze bundle opportunities for adding additional products
 *
 * @param carrier - Carrier from knowledge pack
 * @param policy - Current policy summary
 * @param customerData - Optional customer profile data
 * @returns Array of bundle options (one per missing product)
 */
export function analyzeBundleOptions(
  carrier: Carrier,
  policy: PolicySummary,
  customerData?: UserProfile
): BundleOption[] {
  if (!policy.state || !policy.productType) {
    return []
  }

  // Query knowledge pack for bundle discounts using RAG layer
  const bundleDiscounts = knowledgePackRAG.getCarrierBundleDiscounts(carrier.name, policy.state)

  const bundleOptions: BundleOption[] = []
  const currentProducts = policy.productType ? [policy.productType] : []
  const existingProducts = customerData?.existingPolicies?.map((p) => p.product) || []
  const allCurrentProducts = [...currentProducts, ...existingProducts]

  // Check carrier availability using RAG helper functions
  if (!knowledgePackRAG.getCarrierStateAvailability(carrier.name, policy.state)) {
    return []
  }

  // Get carrier products for state using RAG helper function
  const carrierProducts = knowledgePackRAG.getCarrierProductsForState(carrier.name, policy.state)

  for (const discount of bundleDiscounts) {
    const requirements = getFieldValue(discount.requirements, {}) as DiscountRequirements
    const bundleProducts = requirements.bundleProducts || []

    // Find missing products that would qualify for bundle
    const missingProducts = bundleProducts.filter(
      (product) => !allCurrentProducts.includes(product as 'auto' | 'home' | 'renters' | 'umbrella')
    )

    // Only consider bundles where client has some but not all products
    if (missingProducts.length > 0 && missingProducts.length < bundleProducts.length) {
      if (!policy.state || bundleProducts.length === 0 || !bundleProducts[0]) {
        continue // Skip if no state or no bundle products
      }

      const effectivePercentage = getEffectivePercentage(
        discount,
        policy.state,
        bundleProducts[0] // Use first product for state check
      )

      // Calculate estimated savings using current premium
      const currentPremium = policy.premiums?.annual || 0
      let estimatedSavings = 0

      if (currentPremium > 0) {
        // Use discount percentage × current premium
        estimatedSavings = (effectivePercentage / 100) * currentPremium
      } else {
        // Fallback: Estimate based on bundle products count
        // Rough estimate: assume equal premium distribution
        const estimatedNewProductPremium = 1000 // Default estimate
        const totalBundlePremium = currentPremium + estimatedNewProductPremium
        estimatedSavings = (totalBundlePremium * effectivePercentage) / 100
      }

      const citation = createCitation(discount, carrier)

      // Create one BundleOption per missing product
      for (const missingProduct of missingProducts) {
        // Product availability check: Verify carrier offers the recommended product
        if (!carrierProducts.includes(missingProduct)) {
          continue // Skip if carrier doesn't offer this product
        }

        // Type assertion: missingProduct comes from bundleProducts which is validated
        const productType = missingProduct as 'auto' | 'home' | 'renters' | 'umbrella'

        bundleOptions.push({
          product: productType,
          estimatedSavings,
          requiredActions: [
            `Add ${missingProduct} insurance to qualify for ${getFieldValue(discount.name, 'bundle')} discount`,
          ],
          citation,
        })
      }
    }
  }

  return bundleOptions
}
