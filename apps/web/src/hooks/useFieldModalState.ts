/**
 * useFieldModalState Hook
 *
 * Manages state for the FieldModal component.
 * Single Responsibility: State management only
 */

import { formatNumberForDisplay } from '@repo/shared'
import { useEffect, useState } from 'react'

interface UseFieldModalStateParams {
  open: boolean
  isInferred: boolean
  initialValue?: string
  currentValue?: unknown
  isNumericField: boolean
}

/**
 * Hook for managing FieldModal state
 *
 * @param params - Parameters for state management
 * @returns State values and setters
 */
export function useFieldModalState({
  open,
  isInferred,
  initialValue,
  currentValue,
  isNumericField,
}: UseFieldModalStateParams) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      // For inferred fields, use currentValue; for legacy, use initialValue
      let initialVal: string
      if (isInferred) {
        // Format numeric values for display
        if (isNumericField && typeof currentValue === 'number') {
          initialVal = formatNumberForDisplay(currentValue)
        } else {
          initialVal = String(currentValue ?? '')
        }
      } else {
        // Format numeric values for display
        if (isNumericField && initialValue) {
          const parsed = Number.parseInt(initialValue.replace(/,/g, ''), 10)
          if (!Number.isNaN(parsed)) {
            initialVal = formatNumberForDisplay(parsed)
          } else {
            initialVal = initialValue || ''
          }
        } else {
          initialVal = initialValue || ''
        }
      }
      setValue(initialVal)
      setError('')
    }
  }, [open, initialValue, isInferred, currentValue, isNumericField])

  return { value, setValue, error, setError }
}
