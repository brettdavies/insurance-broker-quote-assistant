/**
 * Compliance Constants and Utilities
 *
 * Shared constants and pure functions for compliance-related functionality.
 * These values and functions are used across frontend and backend.
 */

/**
 * Licensed agent handoff message
 * Used when prohibited content is detected in compliance filter.
 * This message never changes - it's a regulatory requirement.
 */
export const LICENSED_AGENT_HANDOFF_MESSAGE =
  'This response requires review by a licensed insurance agent. Please contact your broker for assistance with this inquiry.'

/**
 * Detect prohibited phrases in output text
 *
 * Pure function that can be used in both frontend and backend.
 * Accepts prohibited phrases as a parameter to avoid backend-specific dependencies.
 *
 * @param output - Output text to check
 * @param prohibitedPhrases - Array of prohibited phrases to check against
 * @returns Array of prohibited phrases detected (empty if none)
 */
export function detectProhibitedPhrases(output: string, prohibitedPhrases: string[]): string[] {
  if (!output || output.trim().length === 0) {
    return []
  }

  const violations: string[] = []
  const lowerOutput = output.toLowerCase()

  for (const phrase of prohibitedPhrases) {
    if (lowerOutput.includes(phrase.toLowerCase())) {
      violations.push(phrase)
    }
  }

  return violations
}
