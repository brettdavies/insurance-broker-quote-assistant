/**
 * Capture Group Replacer
 *
 * Replaces capture group references in inference values.
 */

/**
 * Replace capture group references in inference value
 *
 * Handles capture group references like "$1", "$2", etc. from regex match.
 * If value is not a string or doesn't start with "$", returns as-is.
 * If capture group index is invalid, returns undefined.
 *
 * @param value - Inference value (may contain capture group reference)
 * @param match - Regex match array with capture groups
 * @returns Processed value with capture groups replaced
 *
 * @example
 * ```typescript
 * const match = 'family of 4'.match(/family of (\d+)/)
 * replaceCaptureGroups('$1', match) // Returns '4'
 * replaceCaptureGroups(true, match) // Returns true (no replacement)
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: Value can be any type (string, number, boolean) or capture group reference
export function replaceCaptureGroups(value: any, match: RegExpMatchArray): any {
  // Only process string values starting with "$"
  if (typeof value !== 'string' || !value.startsWith('$')) {
    return value
  }

  // Extract capture group index (e.g., "$1" → 1)
  const captureGroupIndex = Number.parseInt(value.substring(1), 10)

  // Validate capture group index
  if (Number.isNaN(captureGroupIndex) || captureGroupIndex >= match.length) {
    // Invalid capture group - return undefined (no inference)
    return undefined
  }

  // Return capture group value
  const capturedValue = match[captureGroupIndex]

  // Convert numeric strings to numbers
  if (capturedValue && /^\d+$/.test(capturedValue)) {
    return Number.parseInt(capturedValue, 10)
  }

  return capturedValue
}
