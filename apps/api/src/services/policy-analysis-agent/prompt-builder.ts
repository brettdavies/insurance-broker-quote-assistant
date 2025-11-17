/**
 * Policy Analysis Prompt Builder
 *
 * Builds the LLM prompt for policy analysis with policy data and knowledge pack context.
 */

import type { PolicySummary } from '@repo/shared'
import { getFieldValue } from '../../utils/field-helpers'
import type { DeductiblesInfo } from './deductibles-parser'
import { parseDeductibles } from './deductibles-parser'

/**
 * Build analysis prompt with policy data and knowledge pack context
 */
export function buildAnalysisPrompt(
  policySummary: PolicySummary,
  policyText: string | undefined,
  availableDiscounts: import('@repo/shared').Carrier['discounts'],
  bundleDiscounts: import('@repo/shared').Carrier['discounts'],
  carrierProducts: string[],
  carrier: import('@repo/shared').Carrier
): string {
  const parts: string[] = []

  parts.push('Analyze the following insurance policy and identify savings opportunities.')
  parts.push('')

  // Policy context
  parts.push('## Current Policy:')
  if (policyText) {
    parts.push(`Policy Text: ${policyText}`)
  }
  parts.push(`Carrier: ${policySummary.carrier}`)
  parts.push(`State: ${policySummary.state}`)
  parts.push(`Product Type: ${policySummary.productType}`)

  if (policySummary.premiums?.annual) {
    parts.push(`Annual Premium: $${policySummary.premiums.annual}`)
  }

  // Extract deductibles from policySummary or parse from policyText
  const deductiblesToShow = parseDeductibles(policySummary, policyText)

  if (Object.keys(deductiblesToShow).length > 0) {
    if (deductiblesToShow.auto !== undefined)
      parts.push(`Auto Deductible: $${deductiblesToShow.auto}`)
    if (deductiblesToShow.home !== undefined)
      parts.push(`Home Deductible: $${deductiblesToShow.home}`)
    if (deductiblesToShow.comprehensive !== undefined)
      parts.push(`Comprehensive Deductible: $${deductiblesToShow.comprehensive}`)
    if (deductiblesToShow.collision !== undefined)
      parts.push(`Collision Deductible: $${deductiblesToShow.collision}`)
  }

  if (policySummary.coverageLimits) {
    parts.push('Coverage Limits:')
    const limits = policySummary.coverageLimits
    if (limits.liability) parts.push(`  Liability: $${limits.liability}`)
    if (limits.propertyDamage) parts.push(`  Property Damage: $${limits.propertyDamage}`)
    if (limits.dwelling) parts.push(`  Dwelling: $${limits.dwelling}`)
  }

  parts.push('')

  // Knowledge pack context
  parts.push('## Available Discounts:')
  if (availableDiscounts.length === 0) {
    parts.push('No discounts available for this carrier/state/product combination.')
  } else {
    for (const discount of availableDiscounts.slice(0, 10)) {
      // Limit to 10 discounts to avoid prompt bloat
      const name = getFieldValue(discount.name, 'Unknown Discount')
      const percentage = getFieldValue(discount.percentage, 0)
      const requirements = getFieldValue(discount.requirements, {})
      const reqsText =
        typeof requirements === 'object' && requirements !== null
          ? JSON.stringify(requirements)
          : String(requirements)

      parts.push(`- ${name} (${percentage}% off) - Requirements: ${reqsText} - ID: ${discount._id}`)
    }
  }

  parts.push('')

  parts.push('## Bundle Discounts:')
  if (bundleDiscounts.length === 0) {
    parts.push('No bundle discounts available.')
  } else {
    for (const discount of bundleDiscounts.slice(0, 5)) {
      // Limit to 5 bundle discounts
      const name = getFieldValue(discount.name, 'Unknown Bundle Discount')
      const percentage = getFieldValue(discount.percentage, 0)
      const requirements = getFieldValue(discount.requirements, {}) as {
        bundleProducts?: string[]
      }
      const bundleProducts = requirements.bundleProducts || []

      parts.push(
        `- ${name} (${percentage}% off) - Requires: ${bundleProducts.join(' + ')} - ID: ${discount._id}`
      )
    }
  }

  parts.push('')

  parts.push('## Carrier Products:')
  parts.push(`Available products: ${carrierProducts.join(', ')}`)

  parts.push('')

  // Instructions
  parts.push('## Analysis Instructions:')
  parts.push(
    'Analyze the policy and return a structured JSON response with the following analysis:'
  )
  parts.push('')
  parts.push('1. **Missing Discounts (opportunities array):**')
  parts.push('   - Compare current policy against available discounts listed above')
  parts.push('   - Identify discounts the policyholder qualifies for but may not be receiving')
  parts.push(
    '   - For each opportunity, include: discount name, percentage, estimated annual savings in dollars, requirements array, and citation object with cuid2 ID (use discount._id from above)'
  )
  parts.push('')
  parts.push('2. **Bundle Opportunities (bundleOptions array):**')
  parts.push(
    '   - If policy has only one product (auto OR home, not both), suggest adding the missing product for bundle savings'
  )
  parts.push('   - Check bundle discounts listed above to find applicable bundle rules')
  parts.push(
    '   - For each bundle option, include: product to add, estimated savings, required actions array, and citation with discount cuid2 ID'
  )
  parts.push('')
  parts.push('3. **Deductible Optimizations (deductibleOptimizations array):**')
  parts.push(
    '   - **IMPORTANT:** Analyze the current deductibles shown above (or mentioned in Policy Text)'
  )
  parts.push(
    '   - Suggest deductible adjustments that could save money (e.g., raising auto deductible $500→$1000 typically saves $150-200/yr)'
  )
  parts.push(
    '   - Calculate estimated annual savings based on typical premium reductions (higher deductible = lower premium)'
  )
  parts.push(
    '   - Premium impact should be negative (savings) for raising deductibles, positive (cost) for lowering deductibles'
  )
  parts.push('   - If deductibles are shown above, you MUST analyze them and suggest optimizations')
  parts.push(
    '   - Include citation with cuid2 ID for any pricing data used (use discount IDs from knowledge pack)'
  )
  parts.push('')
  parts.push(
    '4. **Ranking:** Sort all opportunities by estimated annual savings impact (highest first)'
  )
  parts.push('')
  parts.push(
    '5. **Citations:** Only include opportunities with valid citations from the knowledge pack (use the discount IDs provided above)'
  )
  parts.push('')
  parts.push('6. **Response Format:** Return a complete PolicyAnalysisResult object with:')
  parts.push('   - currentPolicy: The policy summary provided')
  parts.push('   - opportunities: Array of missing discount opportunities')
  parts.push('   - bundleOptions: Array of bundle opportunities')
  parts.push('   - deductibleOptimizations: Array of deductible trade-offs')
  parts.push('   - pitch: Empty string (will be generated separately)')
  parts.push('   - complianceValidated: false (will be validated separately)')

  return parts.join('\n')
}
