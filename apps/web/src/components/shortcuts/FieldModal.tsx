/**
 * FieldModal Component
 *
 * Orchestrator component for field editing modals.
 * Supports two modes: legacy (slash commands) and inferred (3-button layout).
 * Single Responsibility: Component orchestration and mode selection only
 */

import { COMMAND_TO_FIELD_NAME, FIELD_METADATA, FIELD_TYPE } from '@/config/shortcuts'
import { useFieldModalHandlers } from '@/hooks/useFieldModalHandlers'
import { useFieldModalKeyboard } from '@/hooks/useFieldModalKeyboard'
import { useFieldModalState } from '@/hooks/useFieldModalState'
import { useFieldModalValidation } from '@/hooks/useFieldModalValidation'
import { useNumericInputFormatting } from '@/hooks/useNumericInputFormatting'
import type { FieldCommand } from '@/hooks/useSlashCommands'
import { getEnumOptionsForCombobox, unifiedFieldMetadata } from '@repo/shared'
import type { LexicalEditor } from 'lexical'
import { useEffect, useMemo, useRef } from 'react'
import { FieldModalButtons } from './FieldModalButtons'
import { FieldModalInput } from './FieldModalInput'
import { InferredFieldModal } from './InferredFieldModal'
import { LegacyFieldModal } from './LegacyFieldModal'

/**
 * FieldModal Props Interface
 *
 * Supports two usage patterns:
 * 1. Legacy slash command editing (field + onSubmit)
 * 2. Inferred field editing with 3-button layout (isInferred + callbacks)
 */
interface FieldModalProps {
  // Common props
  open: boolean
  onOpenChange: (open: boolean) => void

  // Legacy slash command props (backward compatibility)
  field?: FieldCommand | null
  onSubmit?: (value: string) => void
  initialValue?: string

  // New inferred field props (Story 4.4)
  /** Whether this is an inferred field (shows 3-button layout) */
  isInferred?: boolean
  /** Field name (for inferred fields) */
  fieldName?: string
  /** Field label (for inferred fields) */
  fieldLabel?: string
  /** Current field value (for inferred fields) */
  currentValue?: unknown
  /** Inference reasoning text (displayed in modal body) */
  reasoning?: string
  /** Confidence score (0-1 scale, shows if <90%) */
  confidence?: number
  /** Callback when [Delete] button clicked (dismisses inference) */
  onDelete?: () => void
  /** Callback when [Save Inferred] button clicked (updates value, keeps as inferred) */
  onSaveInferred?: (value: unknown) => void
  /** Callback when [Save Known] button clicked (converts to known field) */
  onSaveKnown?: (value: unknown) => void
  /** Callback when [Save Known] button clicked and pill is injected (textbox is source of truth) */
  onSaveKnownFromPill?: (fieldName: string) => void
  /** Lexical editor instance (required for pill injection when using [Save Known]) */
  editor?: LexicalEditor | null
}

export function FieldModal({
  open,
  onOpenChange,
  field,
  onSubmit,
  initialValue,
  isInferred = false,
  fieldName,
  fieldLabel,
  currentValue,
  reasoning,
  confidence,
  onDelete,
  onSaveInferred,
  onSaveKnown,
  onSaveKnownFromPill,
  editor,
}: FieldModalProps) {
  // Determine if current field is numeric
  const isNumericField = useMemo(() => {
    if (isInferred && fieldName) {
      const metadata = unifiedFieldMetadata[fieldName]
      return metadata?.fieldType === 'numeric'
    }
    if (field) {
      return FIELD_TYPE[field] === 'numeric'
    }
    return false
  }, [isInferred, fieldName, field])

  // Get field metadata for min/max constraints
  const fieldMetadata = useMemo(() => {
    if (isInferred && fieldName) {
      return unifiedFieldMetadata[fieldName]
    }
    if (field) {
      // Use field directly if not in COMMAND_TO_FIELD_NAME (fields without shortcuts)
      const fieldNameFromCommand = COMMAND_TO_FIELD_NAME[field] || field
      return unifiedFieldMetadata[fieldNameFromCommand] || null
    }
    return null
  }, [isInferred, fieldName, field])

  // State management
  const { value, setValue, error, setError } = useFieldModalState({
    open,
    isInferred,
    initialValue,
    currentValue,
    isNumericField,
  })

  // Track previous value to detect changes from Combobox selection
  const prevValueRef = useRef<string>(value)
  const pendingSubmitRef = useRef(false)

  // Numeric input formatting
  const handleNumericChange = useNumericInputFormatting(setValue, setError)

  // Validation
  const validateField = useFieldModalValidation({
    isNumericField,
    fieldMetadata: fieldMetadata ?? null,
  })

  // Handlers
  const { handleSubmit, handleDelete, handleSaveInferred, handleSaveKnown } = useFieldModalHandlers(
    {
      value,
      isNumericField,
      fieldMetadata: fieldMetadata ?? null,
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
    }
  )

  // Keyboard shortcuts (inferred mode only)
  useFieldModalKeyboard({
    open,
    isInferred,
    value,
    currentValue,
    handleDelete,
    handleSaveInferred,
    handleSaveKnown,
  })

  // Auto-submit when value changes from Combobox Enter selection (legacy mode only)
  useEffect(() => {
    if (!isInferred && pendingSubmitRef.current && value) {
      pendingSubmitRef.current = false
      // Submit after a brief delay to ensure state is fully updated
      const timeoutId = setTimeout(() => {
        handleSubmit()
      }, 10)
      return () => clearTimeout(timeoutId)
    }
  }, [value, isInferred, handleSubmit])

  // Legacy mode: render LegacyFieldModal
  if (!isInferred) {
    if (!field) return null
    const metadata = FIELD_METADATA[field]
    if (!metadata) return null

    return (
      <LegacyFieldModal
        open={open}
        onOpenChange={onOpenChange}
        field={field}
        value={value}
        error={error}
        isNumericField={isNumericField}
        handleNumericChange={handleNumericChange}
        onChange={(newValue: string) => {
          setValue(newValue)
          setError('')
        }}
        onEnterSelect={(selectedValue: string) => {
          // When Enter is pressed in Combobox to select an item, auto-submit
          // Update the value first, then mark for submission
          setValue(selectedValue)
          setError('')
          prevValueRef.current = selectedValue
          pendingSubmitRef.current = true
          // The useEffect will trigger submission after value updates
        }}
        onSubmit={handleSubmit}
      />
    )
  }

  // Inferred mode: render InferredFieldModal
  return (
    <InferredFieldModal
      open={open}
      onOpenChange={onOpenChange}
      fieldName={fieldName}
      fieldLabel={fieldLabel}
      value={value}
      error={error}
      isNumericField={isNumericField}
      handleNumericChange={handleNumericChange}
      onChange={(newValue: string) => {
        setValue(newValue)
        setError('')
      }}
      reasoning={reasoning}
      confidence={confidence}
      currentValue={currentValue}
      onDelete={handleDelete}
      onSaveInferred={handleSaveInferred}
      onSaveKnown={handleSaveKnown}
    />
  )
}
