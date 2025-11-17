/**
 * useFieldModalValidation Hook
 *
 * Handles validation logic for FieldModal.
 * Single Responsibility: Validation only
 */

import { parseAndValidateInteger } from '@repo/shared'
import type { UnifiedFieldMetadata } from '@repo/shared'
import { useCallback } from 'react'

interface UseFieldModalValidationParams {
  isNumericField: boolean
  fieldMetadata: UnifiedFieldMetadata | null
}

/**
 * Hook for field validation
 *
 * @param params - Validation parameters
 * @returns Validation function
 */
export function useFieldModalValidation({
  isNumericField,
  fieldMetadata,
}: UseFieldModalValidationParams) {
  const validateField = useCallback(
    (
      value: string,
      fieldName?: string
    ): { valid: boolean; error?: string; parsedValue?: number } => {
      // Validation and parsing for numeric fields
      if (isNumericField) {
        const validation = parseAndValidateInteger(value, fieldMetadata?.min, fieldMetadata?.max)
        if (!validation.valid) {
          return { valid: false, error: validation.error || 'Please enter a valid number' }
        }
        return { valid: true, parsedValue: validation.parsedValue }
      }

      // Name field requires non-empty value
      if (fieldName === 'name' && !value.trim()) {
        return { valid: false, error: 'Please enter a name' }
      }

      return { valid: true }
    },
    [isNumericField, fieldMetadata]
  )

  return validateField
}
