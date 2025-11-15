/**
 * Fallback Pitch Generator
 *
 * Generates fallback pitch text when LLM fails or no opportunities exist.
 */

import type { BundleOption, DeductibleOptimization, Opportunity } from '@repo/shared'

/**
 * Generate fallback pitch if LLM fails
 */
export function generateFallbackPitch(
  opportunities: Opportunity[],
  bundleOptions: BundleOption[],
  deductibleOptimizations: DeductibleOptimization[]
): string {
  const parts: string[] = []

  if (
    opportunities.length === 0 &&
    bundleOptions.length === 0 &&
    deductibleOptimizations.length === 0
  ) {
    return 'Based on our analysis, your current policy appears well-optimized. We recommend reviewing your coverage annually to ensure you continue to receive the best value.'
  }

  parts.push(
    "Based on our analysis of your current policy, we've identified the following savings opportunities:"
  )
  parts.push('')

  if (opportunities.length > 0) {
    parts.push('**Discount Opportunities:**')
    for (const opp of opportunities.slice(0, 5)) {
      parts.push(
        `- ${opp.discount}: ${opp.percentage}% off, saving approximately $${opp.annualSavings} per year because you qualify for this discount based on your policy details.`
      )
    }
    parts.push('')
  }

  if (bundleOptions.length > 0) {
    parts.push('**Bundle Opportunities:**')
    for (const bundle of bundleOptions.slice(0, 3)) {
      parts.push(
        `- Add ${bundle.product} insurance: Estimated savings of $${bundle.estimatedSavings} per year because bundling multiple policies typically qualifies for additional discounts.`
      )
    }
    parts.push('')
  }

  if (deductibleOptimizations.length > 0) {
    parts.push('**Deductible Adjustments:**')
    for (const opt of deductibleOptimizations.slice(0, 3)) {
      parts.push(
        `- Consider raising your deductible from $${opt.currentDeductible} to $${opt.suggestedDeductible}: This could save approximately $${opt.estimatedSavings} per year because higher deductibles typically result in lower premiums.`
      )
    }
  }

  return parts.join('\n')
}
