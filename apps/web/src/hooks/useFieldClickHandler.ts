/**
 * useFieldClickHandler Hook
 *
 * Manages field click handling for both known and inferred fields.
 *
 * Single Responsibility: Field click logic only
 */

import { type UserProfile, unifiedFieldMetadata } from '@repo/shared'
import { useCallback } from 'react'

interface UseFieldClickHandlerParams {
  inferredFields: Partial<UserProfile>
  setCurrentField: (field: { key: string; value?: string | number | boolean } | null) => void
  setFieldModalOpen: (open: boolean) => void
  openInferredModal: (field: {
    fieldName: string
    fieldLabel: string
    value: unknown
  }) => void
}

export function useFieldClickHandler({
  inferredFields,
  setCurrentField,
  setFieldModalOpen,
  openInferredModal,
}: UseFieldClickHandlerParams) {
  const handleFieldClick = useCallback(
    (fieldKey: string, currentValue?: string | number | boolean) => {
      // Verify it's a valid field
      const isValidField = fieldKey in unifiedFieldMetadata
      if (!isValidField) return

      // Check if this field is inferred
      const isInferred = inferredFields && fieldKey in inferredFields

      if (isInferred) {
        // Open inferred field modal
        const metadata = unifiedFieldMetadata[fieldKey]
        openInferredModal({
          fieldName: fieldKey,
          fieldLabel: metadata?.label || fieldKey,
          value:
            currentValue ?? (inferredFields[fieldKey as keyof typeof inferredFields] as unknown),
        })
      } else {
        // Open regular field modal
        setCurrentField({ key: fieldKey, value: currentValue })
        setFieldModalOpen(true)
      }
    },
    [inferredFields, setCurrentField, setFieldModalOpen, openInferredModal]
  )

  return {
    handleFieldClick,
  }
}
