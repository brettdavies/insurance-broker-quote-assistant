/**
 * Compliance Filter Service
 *
 * Deterministic rules engine that validates all user-facing outputs
 * against prohibited phrase list and injects required disclaimers.
 *
 * 100% deterministic - no LLM calls, pure functions only.
 *
 * @see docs/stories/1.7.adaptive-compliance-filter.md
 */

import {
  LICENSED_AGENT_HANDOFF_MESSAGE,
  detectProhibitedPhrases as detectProhibitedPhrasesShared,
} from '@repo/shared'
import type { ComplianceResult } from '@repo/shared'
import { getDisclaimers as getDisclaimersFromKB, getProhibitedPhrases } from './disclaimers-loader'

/**
 * Validate output against compliance rules
 *
 * @param output - Output text to validate
 * @param state - Optional state code for disclaimer selection
 * @param productType - Optional product type for disclaimer selection
 * @returns ComplianceResult with validation result, violations, and disclaimers
 */
export function validateOutput(
  output: string,
  state?: string | null,
  productType?: string | null
): ComplianceResult {
  // Handle edge cases
  if (!output || output.trim().length === 0) {
    return {
      passed: true,
      disclaimers: getDisclaimersFromKB(state || undefined, productType || undefined),
      state: state || undefined,
      productType: productType || undefined,
    }
  }

  // Detect prohibited phrases using shared function
  const prohibitedPhrases = getProhibitedPhrases()
  const violations = detectProhibitedPhrasesShared(output, prohibitedPhrases)

  // If violations detected, block output
  if (violations.length > 0) {
    return {
      passed: false,
      violations,
      replacementMessage: LICENSED_AGENT_HANDOFF_MESSAGE,
      state: state || undefined,
      productType: productType || undefined,
    }
  }

  // No violations - return disclaimers
  return {
    passed: true,
    disclaimers: getDisclaimersFromKB(state || undefined, productType || undefined),
    state: state || undefined,
    productType: productType || undefined,
  }
}
