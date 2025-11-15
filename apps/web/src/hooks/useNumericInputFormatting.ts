/**
 * useNumericInputFormatting Hook
 *
 * Handles numeric input formatting as the user types.
 * Single Responsibility: Numeric input formatting only
 */

import { formatNumberForDisplay, parseFormattedInteger } from '@repo/shared'
import { useCallback } from 'react'

/**
 * Hook for formatting numeric input
 *
 * @param setValue - Function to set the input value
 * @param setError - Function to set error message
 * @returns Handler function for numeric input changes
 */
export function useNumericInputFormatting(
  setValue: (value: string) => void,
  setError: (error: string) => void
) {
  const handleNumericChange = useCallback(
    (inputValue: string) => {
      // Allow empty input
      if (!inputValue || inputValue.trim() === '') {
        setValue('')
        setError('')
        return
      }

      // Remove all non-digit characters except commas
      // Allow user to type commas naturally
      const cleaned = inputValue.replace(/[^\d,]/g, '')

      // If the cleaned value is empty, set empty
      if (!cleaned) {
        setValue('')
        setError('')
        return
      }

      // Parse the number (removing commas)
      const parsed = parseFormattedInteger(cleaned)

      // If valid number, format it with commas
      if (!Number.isNaN(parsed)) {
        setValue(formatNumberForDisplay(parsed))
      } else {
        // If invalid, just set the cleaned value (allows partial input like "2,")
        setValue(cleaned)
      }

      setError('')
    },
    [setValue, setError]
  )

  return handleNumericChange
}
