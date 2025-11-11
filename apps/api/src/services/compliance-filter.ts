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

import type { ComplianceResult } from '@repo/shared'

/**
 * Prohibited phrases list (case-insensitive matching)
 * These phrases violate insurance compliance regulations
 */
const PROHIBITED_PHRASES = [
  'guaranteed lowest rate',
  "we'll definitely save you",
  'best price guaranteed',
  'you will save',
  'guaranteed approval',
  'guaranteed savings',
  'we guarantee',
  'definitely save',
  'best rate guaranteed',
  'lowest price guaranteed',
  'guaranteed quote',
  'binding quote',
  'final price',
  'exact price',
  'medical advice',
  'health advice',
] as const

/**
 * Licensed agent handoff message
 * Used when prohibited content is detected
 */
const LICENSED_AGENT_HANDOFF_MESSAGE =
  'This response requires review by a licensed insurance agent. Please contact your broker for assistance with this inquiry.'

/**
 * Base disclaimers (always included)
 */
const BASE_DISCLAIMERS = [
  'Rates subject to underwriting and approval',
  'Actual rates may vary based on complete application',
  'Must be reviewed and finalized by a licensed insurance agent',
  'Not a binding quote',
] as const

/**
 * State-specific disclaimers map
 */
const STATE_DISCLAIMERS: Record<string, string[]> = {
  CA: ['California: This quote is an estimate only. Rates subject to underwriting approval.'],
  TX: ['Texas: Rates are estimates and may vary based on final underwriting review.'],
  FL: ['Florida: Quote estimates are preliminary. Final rates determined by carrier underwriting.'],
  NY: ['New York: Quote estimates are non-binding and subject to carrier underwriting review.'],
  IL: ['Illinois: Rates are estimates only. Final premium determined after underwriting approval.'],
}

/**
 * Product-specific disclaimers map
 */
const PRODUCT_DISCLAIMERS: Record<string, string[]> = {
  auto: ['Auto Insurance: Coverage limits and deductibles affect premium. Final quote may vary.'],
  home: ['Home Insurance: Property details and location impact rates. Underwriting required.'],
  renters: [
    'Renters Insurance: Property details and coverage limits affect premium. Underwriting required.',
  ],
  umbrella: [
    'Umbrella Insurance: Coverage limits and underlying policies affect premium. Underwriting required.',
  ],
}

/**
 * Get disclaimers based on state and product line
 *
 * @param state - State code (e.g., 'CA', 'TX')
 * @param productLine - Product line (e.g., 'auto', 'home')
 * @returns Array of disclaimers (base + state-specific + product-specific)
 */
function getDisclaimers(state?: string, productLine?: string): string[] {
  const disclaimers: string[] = [...BASE_DISCLAIMERS]

  // Add state-specific disclaimers
  if (state && STATE_DISCLAIMERS[state]) {
    disclaimers.push(...STATE_DISCLAIMERS[state])
  }

  // Add product-specific disclaimers
  if (productLine && PRODUCT_DISCLAIMERS[productLine]) {
    disclaimers.push(...PRODUCT_DISCLAIMERS[productLine])
  }

  // Remove duplicates (preserve order)
  return Array.from(new Set(disclaimers))
}

/**
 * Detect prohibited phrases in output text
 *
 * @param output - Output text to check
 * @returns Array of prohibited phrases detected (empty if none)
 */
function detectProhibitedPhrases(output: string): string[] {
  if (!output || output.trim().length === 0) {
    return []
  }

  const violations: string[] = []
  const lowerOutput = output.toLowerCase()

  for (const phrase of PROHIBITED_PHRASES) {
    if (lowerOutput.includes(phrase.toLowerCase())) {
      violations.push(phrase)
    }
  }

  return violations
}

/**
 * Validate output against compliance rules
 *
 * @param output - Output text to validate
 * @param state - Optional state code for disclaimer selection
 * @param productLine - Optional product line for disclaimer selection
 * @returns ComplianceResult with validation result, violations, and disclaimers
 */
export function validateOutput(
  output: string,
  state?: string | null,
  productLine?: string | null
): ComplianceResult {
  // Handle edge cases
  if (!output || output.trim().length === 0) {
    return {
      passed: true,
      disclaimers: getDisclaimers(state || undefined, productLine || undefined),
      state: state || undefined,
      productLine: productLine || undefined,
    }
  }

  // Detect prohibited phrases
  const violations = detectProhibitedPhrases(output)

  // If violations detected, block output
  if (violations.length > 0) {
    return {
      passed: false,
      violations,
      replacementMessage: LICENSED_AGENT_HANDOFF_MESSAGE,
      state: state || undefined,
      productLine: productLine || undefined,
    }
  }

  // No violations - return disclaimers
  return {
    passed: true,
    disclaimers: getDisclaimers(state || undefined, productLine || undefined),
    state: state || undefined,
    productLine: productLine || undefined,
  }
}
