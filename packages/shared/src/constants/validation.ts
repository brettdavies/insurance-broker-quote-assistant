/**
 * Validation Constants
 *
 * Centralized constants for validation thresholds and tolerances.
 */

/**
 * Savings tolerance in dollars for discount validation
 * LLM-calculated savings within this tolerance are accepted
 */
export const SAVINGS_TOLERANCE_DOLLARS = 10

/**
 * Missing field penalty multiplier for routing engine scoring
 * Each missing optional field reduces match score by this amount
 */
export const MISSING_FIELD_PENALTY = 0.1
