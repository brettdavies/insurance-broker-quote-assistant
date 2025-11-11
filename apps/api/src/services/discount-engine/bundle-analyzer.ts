/**
 * Bundle Analyzer
 *
 * Analyzes bundle opportunities for adding additional products
 */

import type { Carrier, PolicySummary, UserProfile } from '@repo/shared'
import { getFieldValue } from '../../utils/field-helpers'
import type { BundleOpportunity, DiscountRequirements } from './types'
import { createCitation } from './utils/citation'
import { getEffectivePercentage } from './utils/percentage'

/**
 * Analyze bundle opportunities for adding additional products
 *
 * @param carrier - Carrier from knowledge pack
 * @param policy - Current policy summary
 * @param customerData - Optional customer profile data
 * @returns Array of bundle opportunities
 */
export function analyzeBundleOptions(
  carrier: Carrier,
  policy: PolicySummary,
  customerData?: UserProfile
): BundleOpportunity[] {
  if (!policy.state || !policy.productType) {
    return []
  }

  // Find bundle discounts
  const bundleDiscounts = carrier.discounts.filter((d) => {
    const reqs = getFieldValue(d.requirements, {}) as DiscountRequirements
    return reqs.bundleProducts && reqs.bundleProducts.length > 1
  })

  const opportunities: BundleOpportunity[] = []
  const currentProducts = policy.productType ? [policy.productType] : []
  const existingProducts = customerData?.existingPolicies?.map((p) => p.product) || []
  const allCurrentProducts = [...currentProducts, ...existingProducts]

  for (const discount of bundleDiscounts) {
    const requirements = getFieldValue(discount.requirements, {}) as DiscountRequirements
    const bundleProducts = requirements.bundleProducts || []

    // Find missing products
    const missingProducts = bundleProducts.filter(
      (product) => !allCurrentProducts.includes(product as 'auto' | 'home' | 'renters' | 'umbrella')
    )

    if (missingProducts.length > 0 && missingProducts.length < bundleProducts.length) {
      // Partial bundle opportunity - client has some but not all products
      if (!policy.state || bundleProducts.length === 0 || !bundleProducts[0]) {
        continue // Skip if no state or no bundle products
      }
      const effectivePercentage = getEffectivePercentage(
        discount,
        policy.state,
        bundleProducts[0] // Use first product for state check
      )

      // Calculate current bundle premium
      let currentBundlePremium = 0
      for (const product of bundleProducts) {
        if (product === policy.productType && policy.premiums?.annual) {
          currentBundlePremium += policy.premiums.annual
        } else if (customerData?.existingPolicies) {
          const existingPolicy = customerData.existingPolicies.find((p) => p.product === product)
          if (existingPolicy?.premium) {
            currentBundlePremium += existingPolicy.premium
          }
        }
      }

      // Estimate new product premium (simplified - could use knowledge pack pricing data)
      // For now, use a rough estimate based on current premium
      const estimatedNewProductPremium = currentBundlePremium / bundleProducts.length
      const totalBundlePremium = currentBundlePremium + estimatedNewProductPremium
      const estimatedSavings = (totalBundlePremium * effectivePercentage) / 100

      opportunities.push({
        discountId: discount._id,
        discountName: getFieldValue(discount.name, ''),
        missingProducts,
        estimatedSavings,
        requiredActions: [
          `Add ${missingProducts.join(' and ')} insurance to qualify for bundle discount`,
        ],
        citation: createCitation(discount, carrier),
      })
    }
  }

  return opportunities
}
