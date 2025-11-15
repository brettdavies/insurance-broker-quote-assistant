/**
 * Deductibles Parser
 *
 * Extracts deductible information from policy summary or policy text.
 */

import type { PolicySummary } from '@repo/shared'

export type DeductiblesInfo = {
  auto?: number
  home?: number
  comprehensive?: number
  collision?: number
}

/**
 * Parse deductibles from policy summary or policy text
 *
 * @param policySummary - Policy summary with optional deductibles
 * @param policyText - Optional policy text (key-value format) for parsing
 * @returns Deductibles information object
 */
export function parseDeductibles(
  policySummary: PolicySummary,
  policyText?: string
): DeductiblesInfo {
  // First, try to get deductibles from policySummary
  if (policySummary.deductibles) {
    return policySummary.deductibles
  }

  // If not in policySummary, try to parse from policyText
  if (policyText) {
    // Format: "deductible:$500" or "deductible:auto:$500" or "deductible:500"
    // Regex: matches "deductible" optionally followed by ":type" then ":$value" or ":value"
    const deductibleMatch = policyText.match(
      /deductible(?::(auto|home|comprehensive|collision))?:[\$]?(\d+)/i
    )
    if (deductibleMatch?.[2]) {
      const deductibleValue = Number.parseInt(deductibleMatch[2], 10)
      const deductibleType = deductibleMatch[1]?.toLowerCase() || 'auto'
      const result: DeductiblesInfo = {}

      if (deductibleType === 'auto' || !deductibleMatch[1]) {
        result.auto = deductibleValue
      } else if (deductibleType === 'home') {
        result.home = deductibleValue
      } else if (deductibleType === 'comprehensive') {
        result.comprehensive = deductibleValue
      } else if (deductibleType === 'collision') {
        result.collision = deductibleValue
      }

      return result
    }
  }

  return {}
}
