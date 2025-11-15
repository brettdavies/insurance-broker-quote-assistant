import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  COMMAND_TO_FIELD_NAME,
  COMMAND_TO_KEY,
  FIELD_METADATA,
  FIELD_TYPE,
} from '@/config/shortcuts'
import { usePillInjection } from '@/hooks/usePillInjection'
import type { FieldCommand } from '@/hooks/useSlashCommands'
import {
  STATE_NAME_TO_CODE,
  formatNumberForDisplay,
  parseAndValidateInteger,
  parseFormattedInteger,
  unifiedFieldMetadata,
} from '@repo/shared'
import type { LexicalEditor } from 'lexical'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  editor,
}: FieldModalProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  // Pill injection hook for [Save Known] button
  const { injectPill } = usePillInjection(editor ?? null)

  // Helper function to handle numeric input changes
  // Formats numbers with commas as the user types
  const handleNumericChange = useCallback((inputValue: string) => {
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
  }, [])

  // Helper function to convert enum options to ComboboxOptions
  // Special handling for state field to show "CA - California" format
  const getComboboxOptions = useCallback(
    (fieldName: string | undefined, options: string[] | undefined): ComboboxOption[] => {
      if (!options) return []

      // Special handling for state field
      if (fieldName === 'state') {
        // Create a mapping of state codes to full names
        // Use the primary name (longest single-word name, or multi-word name)
        const stateCodeToName: Record<string, string> = {}
        for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
          // Skip aliases (short names like "cali", "fla", etc.)
          if (name.length <= 3 && !name.includes(' ')) continue

          // Prefer longer names or multi-word names
          if (
            !stateCodeToName[code] ||
            name.length > stateCodeToName[code].length ||
            (name.includes(' ') && !stateCodeToName[code].includes(' '))
          ) {
            // Capitalize first letter of each word
            const capitalized = name
              .split(' ')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            stateCodeToName[code] = capitalized
          }
        }

        // Special case for DC
        stateCodeToName.DC = 'District of Columbia'

        return options.map((code) => {
          const fullName = stateCodeToName[code] || code
          return {
            value: code,
            label: fullName !== code ? `${code} - ${fullName}` : code,
            searchText: fullName, // Allow searching by full name
          }
        })
      }

      // For other enum fields, just use the option value as both value and label
      return options.map((option) => ({
        value: option,
        label: option,
      }))
    },
    []
  )

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
      const fieldNameFromCommand = COMMAND_TO_FIELD_NAME[field]
      return fieldNameFromCommand ? unifiedFieldMetadata[fieldNameFromCommand] : null
    }
    return null
  }, [isInferred, fieldName, field])

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

  // Legacy submit handler (for slash commands)
  const handleSubmit = () => {
    if (!field || !onSubmit) return

    let finalValue: string = value

    // Validation and parsing for numeric fields
    if (isNumericField) {
      const validation = parseAndValidateInteger(value, fieldMetadata?.min, fieldMetadata?.max)
      if (!validation.valid) {
        setError(validation.error || 'Please enter a valid number')
        return
      }
      // Store the parsed integer (without formatting)
      if (validation.parsedValue !== undefined) {
        finalValue = String(validation.parsedValue)
      }
    }

    // Name field requires non-empty value
    if (field === 'name' && !value.trim()) {
      setError('Please enter a name')
      return
    }

    onSubmit(finalValue)
    onOpenChange(false)
  }

  // New handlers for inferred fields (Story 4.4)
  const handleDelete = useCallback(() => {
    onDelete?.()
    onOpenChange(false)
  }, [onDelete, onOpenChange])

  const handleSaveInferred = useCallback(() => {
    let finalValue: unknown = value

    // Parse and validate numeric fields
    if (isNumericField) {
      const validation = parseAndValidateInteger(value, fieldMetadata?.min, fieldMetadata?.max)
      if (!validation.valid) {
        setError(validation.error || 'Please enter a valid number')
        return
      }
      // Store the parsed integer (without formatting)
      if (validation.parsedValue !== undefined) {
        finalValue = validation.parsedValue
      }
    }

    onSaveInferred?.(finalValue)
    onOpenChange(false)
  }, [onSaveInferred, value, onOpenChange, isNumericField, fieldMetadata])

  const handleSaveKnown = useCallback(() => {
    let finalValue: unknown = value

    // Parse and validate numeric fields
    if (isNumericField) {
      const validation = parseAndValidateInteger(value, fieldMetadata?.min, fieldMetadata?.max)
      if (!validation.valid) {
        setError(validation.error || 'Please enter a valid number')
        return
      }
      // Store the parsed integer (without formatting)
      if (validation.parsedValue !== undefined) {
        finalValue = validation.parsedValue
      }
    }

    // Story 4.5: Inject pill into lexical editor before converting to known
    if (fieldName) {
      injectPill(fieldName, String(finalValue))
    }

    // Call parent callback to update state
    onSaveKnown?.(finalValue)
    onOpenChange(false)
  }, [onSaveKnown, value, onOpenChange, fieldName, injectPill, isNumericField, fieldMetadata])

  // Keyboard shortcuts for inferred fields
  useEffect(() => {
    if (!open || !isInferred) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key: Trigger [Delete] button (inferred only)
      if (e.key === 'Delete') {
        e.preventDefault()
        handleDelete()
      }

      // Cmd+S or Enter: Trigger [Save Inferred] (inferred only, if value changed)
      if ((e.metaKey && e.key === 's') || e.key === 'Enter') {
        if (value !== String(currentValue ?? '')) {
          e.preventDefault()
          handleSaveInferred()
        }
      }

      // Cmd+Shift+S: Trigger [Save Known] (inferred only)
      if (e.metaKey && e.shiftKey && e.key === 's') {
        e.preventDefault()
        handleSaveKnown()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isInferred, value, currentValue, handleDelete, handleSaveInferred, handleSaveKnown])

  // Legacy mode: require field and metadata
  if (!isInferred) {
    if (!field) return null
    const metadata = FIELD_METADATA[field]
    if (!metadata) return null

    // Get unified metadata to check for enum options
    const fieldName = COMMAND_TO_FIELD_NAME[field]
    const unifiedMetadata = fieldName ? unifiedFieldMetadata[fieldName] : null
    const hasOptions = unifiedMetadata?.options && unifiedMetadata.options.length > 0

    // If field has a shortcut, use it; otherwise use the normalized field name
    // Handle empty string shortcuts by checking length
    const shortcutKey =
      metadata.shortcut && metadata.shortcut.length > 0 ? metadata.shortcut : fieldName || field
    const shortcutPrefix = `${shortcutKey}:`

    // Determine input type based on field (derived from UserProfile metadata)
    const getInputType = (): 'text' | 'number' | 'email' | 'tel' => {
      if (FIELD_TYPE[field] === 'numeric') {
        return 'number'
      }
      // Special cases for email and phone input types
      if (field === 'email') return 'email'
      if (field === 'phone') return 'tel'
      return 'text'
    }

    // Get placeholder based on field type (derived from UserProfile metadata)
    const getPlaceholder = (): string => {
      const fieldType = FIELD_TYPE[field]
      if (fieldType === 'numeric') {
        // Special case: vehicles must be >= 1
        if (field === 'vehicles') return '1'
        // Special case: credit score range hint
        if (field === 'creditScore') return '650'
        return '0'
      }
      // Special case: name field gets example placeholder
      if (field === 'name') return 'John Doe'
      return ''
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{metadata.label}</DialogTitle>
            <DialogDescription>{metadata.question}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Input/Select with shortcut prefix */}
            <div className="flex items-center rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
              <span className="px-3 py-2 font-mono text-sm text-gray-500 dark:text-gray-400">
                {shortcutPrefix}
              </span>
              {hasOptions ? (
                <Combobox
                  options={getComboboxOptions(fieldName, unifiedMetadata.options)}
                  value={value}
                  onChange={(newValue) => {
                    setValue(newValue)
                    setError('')
                  }}
                  placeholder="Type to search..."
                  className="border-0 focus-visible:ring-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit()
                    }
                    if (e.key === 'Escape') {
                      onOpenChange(false)
                    }
                  }}
                />
              ) : (
                <Input
                  type={isNumericField ? 'text' : getInputType()}
                  value={value}
                  onChange={(e) => {
                    if (isNumericField) {
                      handleNumericChange(e.target.value)
                    } else {
                      setValue(e.target.value)
                      setError('')
                    }
                  }}
                  placeholder={getPlaceholder()}
                  className="border-0 focus-visible:ring-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit()
                    }
                    if (e.key === 'Escape') {
                      onOpenChange(false)
                    }
                  }}
                />
              )}
            </div>
            {error && <div className="text-error text-sm">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Inferred field mode: Show 3-button layout with reasoning/confidence
  const title = isInferred && fieldLabel ? `${fieldLabel} (Inferred)` : fieldLabel || 'Edit Field'
  const showConfidence = confidence !== undefined && confidence < 0.9

  // Get unified metadata to check for enum options (for inferred fields)
  const unifiedMetadata = fieldName ? unifiedFieldMetadata[fieldName] : null
  const hasOptions = unifiedMetadata?.options && unifiedMetadata.options.length > 0

  // If field has a shortcut, use it; otherwise use the normalized field name
  // Always show a prefix (shortcut or field name)
  // Handle empty string shortcuts by checking length
  const shortcutKey =
    unifiedMetadata?.shortcut && unifiedMetadata.shortcut.length > 0
      ? unifiedMetadata.shortcut
      : fieldName || ''
  const shortcutPrefix = `${shortcutKey}:`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Input/Select field with prefix */}
          <div className="flex items-center rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
            <span className="px-3 py-2 font-mono text-sm text-gray-500 dark:text-gray-400">
              {shortcutPrefix}
            </span>
            {hasOptions ? (
              <Combobox
                options={getComboboxOptions(fieldName, unifiedMetadata.options)}
                value={value}
                onChange={(newValue) => {
                  setValue(newValue)
                  setError('')
                }}
                placeholder="Type to search..."
                className="border-0 focus-visible:ring-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (value !== String(currentValue ?? '')) {
                      handleSaveInferred()
                    }
                  }
                  if (e.key === 'Escape') {
                    onOpenChange(false)
                  }
                }}
              />
            ) : (
              <Input
                type={isNumericField ? 'text' : 'text'}
                value={value}
                onChange={(e) => {
                  if (isNumericField) {
                    handleNumericChange(e.target.value)
                  } else {
                    setValue(e.target.value)
                    setError('')
                  }
                }}
                className="border-0 focus-visible:ring-0"
                autoFocus
              />
            )}
          </div>

          {/* Reasoning section (inferred only) */}
          {reasoning && (
            <div className="space-y-2 border-t border-gray-700 pt-3">
              <p className="text-sm font-bold">Reasoning:</p>
              <p className="text-sm text-[#a3a3a3]">{reasoning}</p>
            </div>
          )}

          {/* Confidence section (inferred only, if <90%) */}
          {showConfidence && (
            <div className="border-t border-gray-700 pt-2">
              <p className="text-xs italic text-[#737373]">
                Confidence: {Math.round(confidence * 100)}%
              </p>
            </div>
          )}

          {error && <div className="text-error text-sm">{error}</div>}

          {/* 3-button layout */}
          <div className="flex justify-end gap-2 border-t border-gray-700 pt-3">
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveInferred}
              disabled={value === String(currentValue ?? '')}
            >
              Save Inferred
            </Button>
            <Button variant="default" onClick={handleSaveKnown}>
              Save Known
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
