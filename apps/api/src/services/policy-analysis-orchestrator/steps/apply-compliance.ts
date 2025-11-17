/**
 * Apply Compliance Step
 *
 * Applies compliance filter to pitch.
 */

import type { PolicySummary } from '@repo/shared'
import { logError } from '../../../utils/logger'
import { validateOutput } from '../../compliance-filter'

/**
 * Apply compliance filter to pitch
 */
export async function applyComplianceFilter(
  pitch: string,
  policySummary: PolicySummary
): Promise<{
  passed: boolean
  disclaimers?: string[]
  replacementMessage?: string
  violations?: string[]
  state?: string
  productType?: string
}> {
  try {
    const result = validateOutput(pitch, policySummary.state, policySummary.productType)
    // Convert null to undefined for type compatibility
    return {
      passed: result.passed,
      disclaimers: result.disclaimers ?? undefined,
      replacementMessage: result.replacementMessage ?? undefined,
      violations: result.violations ?? undefined,
      state: result.state ?? undefined,
      productType: result.productType ?? undefined,
    }
  } catch (error) {
    await logError('Compliance filter error in policy analyze', error as Error, {
      type: 'compliance_error',
    })
    return {
      passed: false,
      disclaimers: [],
    }
  }
}
