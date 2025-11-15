/**
 * Analyze Bundles Step
 *
 * Analyzes bundle options and merges with LLM-generated ones.
 */

import type { BundleOption, Carrier, PolicySummary } from '@repo/shared'
import { logError, logInfo } from '../../../utils/logger'
import { analyzeBundleOptions } from '../../discount-engine'

/**
 * Analyze bundle options and merge with existing ones
 */
export async function analyzeBundleOpportunities(
  carrier: Carrier,
  policySummary: PolicySummary,
  existingBundleOptions: BundleOption[]
): Promise<{ uniqueBundleOptions: BundleOption[]; bundleOptionsFromAnalyzer: BundleOption[] }> {
  // Call Bundle Analyzer to detect bundle opportunities
  let bundleOptionsFromAnalyzer: BundleOption[] = []
  try {
    bundleOptionsFromAnalyzer = analyzeBundleOptions(carrier, policySummary, undefined)
    await logInfo('Bundle analysis completed', {
      type: 'bundle_analysis_success',
      carrier: policySummary.carrier,
      state: policySummary.state,
      bundleOptionsCount: bundleOptionsFromAnalyzer.length,
    })
  } catch (error) {
    await logError('Bundle analysis failed', error as Error, {
      type: 'bundle_analysis_error',
      carrier: policySummary.carrier,
      state: policySummary.state,
    })
    // Continue with other opportunities if bundle analysis fails
    bundleOptionsFromAnalyzer = []
  }

  // Merge bundle options from analyzer with LLM-generated ones
  // Deduplicate by product to avoid showing the same opportunity twice
  const allBundleOptions = [...existingBundleOptions, ...bundleOptionsFromAnalyzer]
  const uniqueBundleOptions = allBundleOptions.reduce((acc: BundleOption[], option) => {
    const existing = acc.find((opt) => opt.product === option.product)
    if (!existing) {
      acc.push(option)
    } else {
      // Keep the one with higher estimated savings
      if (option.estimatedSavings > existing.estimatedSavings) {
        const index = acc.indexOf(existing)
        acc[index] = option
      }
    }
    return acc
  }, [])

  return { uniqueBundleOptions, bundleOptionsFromAnalyzer }
}
