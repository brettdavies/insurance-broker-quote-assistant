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
  fieldMetadata: { min?: number; max?: number; fieldType?: string } | null
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
  onSaveKnownFromPill?: (fieldName: string) => void // For when pill injection triggers profile update
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
  onSaveKnownFromPill,
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
    } else if (fieldMetadata?.fieldType === 'boolean') {
      // Convert boolean string values to actual booleans
      finalValue = value === 'true'
    }

    onSaveInferred(finalValue)
    onOpenChange(false)
  }, [
    value,
    isNumericField,
    fieldName,
    fieldMetadata,
    validateField,
    setError,
    onSaveInferred,
    onOpenChange,
  ])

  const handleSaveKnown = useCallback(() => {
    if (!fieldName) return

    const validation = validateField(value, fieldName)
    if (!validation.valid) {
      setError(validation.error || 'Please enter a valid value')
      return
    }

    let finalValue: unknown = value

    // For numeric fields, use parsed value
    if (isNumericField && validation.parsedValue !== undefined) {
      finalValue = validation.parsedValue
    } else if (fieldMetadata?.fieldType === 'boolean') {
      // Convert boolean string values to actual booleans
      finalValue = value === 'true'
    }

    // Inject pill into editor (textbox is source of truth)
    // Pill injection will trigger PillFieldExtractionPlugin which calls onFieldExtracted
    // to update the profile. We just need to remove suppression and re-run inference.
    if (fieldName && editor) {
      injectPill(fieldName, finalValue)

      // Use the new callback that only handles suppression/inference (not profile update)
      if (onSaveKnownFromPill) {
        // Use a small delay to ensure pill extraction completes first
        setTimeout(() => {
          onSaveKnownFromPill(fieldName)
        }, 0)
      } else if (onSaveKnown) {
        // Fallback to old behavior for backward compatibility
        onSaveKnown(finalValue)
      }
    } else if (onSaveKnown) {
      // Fallback if no editor or fieldName
      onSaveKnown(finalValue)
    }

    onOpenChange(false)
  }, [
    value,
    isNumericField,
    fieldName,
    fieldMetadata,
    validateField,
    setError,
    onSaveKnown,
    onSaveKnownFromPill,
    injectPill,
    editor,
    onOpenChange,
  ])

  return {
    handleSubmit,
    handleDelete,
    handleSaveInferred,
    handleSaveKnown,
  }
}
