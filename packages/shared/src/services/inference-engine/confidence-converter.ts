/**
 * Confidence Converter
 *
 * Converts confidence levels to numeric scores.
 */

/**
 * Convert confidence level to numeric score
 *
 * Maps confidence levels to numeric scores for API response.
 * Scores are aligned with LLM upgrade threshold (≥85% allows LLM to upgrade inferred → known).
 *
 * @param level - Confidence level from inference rule
 * @returns Numeric confidence score (0-1 scale)
 *
 * **Mapping:**
 * - 'high' → 0.85 (≥85% threshold allows LLM to upgrade to known field)
 * - 'medium' → 0.70
 * - 'low' → 0.50
 */
export function confidenceToNumber(level: 'high' | 'medium' | 'low'): number {
  switch (level) {
    case 'high':
      return 0.85
    case 'medium':
      return 0.7
    case 'low':
      return 0.5
  }
}
