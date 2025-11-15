/**
 * useFieldModalHandlers Hook
 *
 * Handles all action handlers for FieldModal.
 * Single Responsibility: Event handlers only
 */

import { usePillInjection } from '@/hooks/usePillInjection'
import type { LexicalEditor } from 'lexical'
import { useCallback } from 'react'

interface UseFieldModalHandlersParams {
  value: string
  isNumericField: boolean
  fieldMetadata: { min?: number; max?: number } | null
  validateField: (
    value: string,
    fieldName?: string
  ) => {
    valid: boolean
    error?: string
    parsedValue?: number
  }
  setError: (error: string) => void
  onOpenChange: (open: boolean) => void
  // Legacy mode
  onSubmit?: (value: string) => void
  // Inferred mode
  onDelete?: () => void
  onSaveInferred?: (value: unknown) => void
  onSaveKnown?: (value: unknown) => void
  fieldName?: string
  currentValue?: unknown
  editor?: LexicalEditor | null
}

/**
 * Hook for FieldModal handlers
 *
 * @param params - Handler parameters
 * @returns Handler functions
 */
export function useFieldModalHandlers({
  value,
  isNumericField,
  fieldMetadata,
  validateField,
  setError,
  onOpenChange,
  onSubmit,
  onDelete,
  onSaveInferred,
  onSaveKnown,
  fieldName,
  currentValue,
  editor,
}: UseFieldModalHandlersParams) {
  const { injectPill } = usePillInjection(editor ?? null)

  // Legacy submit handler (for slash commands)
  const handleSubmit = useCallback(() => {
    if (!onSubmit) return

    const validation = validateField(value)
    if (!validation.valid) {
      setError(validation.error || 'Please enter a valid value')
      return
    }

    let finalValue: string = value

    // For numeric fields, use parsed value
    if (isNumericField && validation.parsedValue !== undefined) {
      finalValue = String(validation.parsedValue)
    }

    onSubmit(finalValue)
    onOpenChange(false)
  }, [value, isNumericField, validateField, setError, onSubmit, onOpenChange])

  // Inferred field handlers
  const handleDelete = useCallback(() => {
    onDelete?.()
    onOpenChange(false)
  }, [onDelete, onOpenChange])

  const handleSaveInferred = useCallback(() => {
    if (!onSaveInferred) return

    const validation = validateField(value, fieldName)
    if (!validation.valid) {
      setError(validation.error || 'Please enter a valid value')
      return
    }

    let finalValue: unknown = value

    // For numeric fields, use parsed value
    if (isNumericField && validation.parsedValue !== undefined) {
      finalValue = validation.parsedValue
    }

    onSaveInferred(finalValue)
    onOpenChange(false)
  }, [value, isNumericField, fieldName, validateField, setError, onSaveInferred, onOpenChange])

  const handleSaveKnown = useCallback(() => {
    if (!onSaveKnown) return

    const validation = validateField(value, fieldName)
    if (!validation.valid) {
      setError(validation.error || 'Please enter a valid value')
      return
    }

    let finalValue: unknown = value

    // For numeric fields, use parsed value
    if (isNumericField && validation.parsedValue !== undefined) {
      finalValue = validation.parsedValue
    }

    // Story 4.5: Inject pill into lexical editor before converting to known
    if (fieldName) {
      injectPill(fieldName, String(finalValue))
    }

    // Call parent callback to update state
    onSaveKnown(finalValue)
    onOpenChange(false)
  }, [
    value,
    isNumericField,
    fieldName,
    validateField,
    setError,
    onSaveKnown,
    injectPill,
    onOpenChange,
  ])

  return {
    handleSubmit,
    handleDelete,
    handleSaveInferred,
    handleSaveKnown,
  }
}
