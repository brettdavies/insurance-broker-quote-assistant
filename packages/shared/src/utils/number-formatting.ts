/**
 * Number Formatting Utilities
 *
 * Shared utilities for formatting and parsing numeric field values.
 * Used by both frontend (FieldModal) and backend (validation) to ensure consistency.
 *
 * Features:
 * - Pretty formatting with commas for display (e.g., "2,000,000")
 * - Stripping formatting for storage (e.g., "2000000")
 * - Integer validation with min/max constraints
 */

/**
 * Format a number with comma separators for display
 * @param value - Number or string representation of a number
 * @returns Formatted string with commas (e.g., "2,000,000")
 *
 * @example
 * formatNumberForDisplay(2000000) // "2,000,000"
 * formatNumberForDisplay("2000000") // "2,000,000"
 * formatNumberForDisplay(0) // "0"
 */
export function formatNumberForDisplay(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  // Convert to number if string
  const num = typeof value === 'string' ? Number.parseFloat(value.replace(/,/g, '')) : value

  // Return empty string if invalid
  if (Number.isNaN(num)) {
    return ''
  }

  // Format with commas
  return num.toLocaleString('en-US', {
    maximumFractionDigits: 0,
    useGrouping: true,
  })
}

/**
 * Parse a formatted number string (with commas) to an integer
 * Strips all formatting and returns the numeric value
 * @param value - Formatted string (e.g., "2,000,000" or "2000000")
 * @returns Parsed integer, or NaN if invalid
 *
 * @example
 * parseFormattedInteger("2,000,000") // 2000000
 * parseFormattedInteger("2000000") // 2000000
 * parseFormattedInteger("invalid") // NaN
 */
export function parseFormattedInteger(value: string): number {
  if (!value || value.trim() === '') {
    return Number.NaN
  }

  // Remove all commas and whitespace, then parse
  const cleaned = value.replace(/,/g, '').trim()
  return Number.parseInt(cleaned, 10)
}

/**
 * Validate an integer value against min/max constraints
 * @param value - Integer value to validate
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns Object with `valid` boolean and optional `error` message
 *
 * @example
 * validateInteger(1500, 0, 1000) // { valid: false, error: "Value must be between 0 and 1,000" }
 * validateInteger(500, 0, 1000) // { valid: true }
 */
export function validateInteger(
  value: number,
  min?: number,
  max?: number
): { valid: boolean; error?: string } {
  // Check if value is a valid integer
  if (Number.isNaN(value) || !Number.isFinite(value) || !Number.isInteger(value)) {
    return { valid: false, error: 'Please enter a valid integer' }
  }

  // Check min constraint
  if (min !== undefined && value < min) {
    const minFormatted = formatNumberForDisplay(min)
    if (max !== undefined) {
      const maxFormatted = formatNumberForDisplay(max)
      return {
        valid: false,
        error: `Value must be between ${minFormatted} and ${maxFormatted}`,
      }
    }
    return { valid: false, error: `Value must be at least ${minFormatted}` }
  }

  // Check max constraint
  if (max !== undefined && value > max) {
    const maxFormatted = formatNumberForDisplay(max)
    if (min !== undefined) {
      const minFormatted = formatNumberForDisplay(min)
      return {
        valid: false,
        error: `Value must be between ${minFormatted} and ${maxFormatted}`,
      }
    }
    return { valid: false, error: `Value must be at most ${maxFormatted}` }
  }

  return { valid: true }
}

/**
 * Parse and validate a formatted number string
 * Combines parsing and validation into a single operation
 * @param value - Formatted string (e.g., "2,000,000")
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns Object with `valid` boolean, optional `error` message, and optional `parsedValue`
 *
 * @example
 * parseAndValidateInteger("2,000,000", 0, 1000000) // { valid: false, error: "..." }
 * parseAndValidateInteger("500,000", 0, 1000000) // { valid: true, parsedValue: 500000 }
 */
export function parseAndValidateInteger(
  value: string,
  min?: number,
  max?: number
): { valid: boolean; error?: string; parsedValue?: number } {
  const parsed = parseFormattedInteger(value)
  const validation = validateInteger(parsed, min, max)

  if (!validation.valid) {
    return { valid: false, error: validation.error }
  }

  return { valid: true, parsedValue: parsed }
}
