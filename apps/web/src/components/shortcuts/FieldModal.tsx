import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FIELD_METADATA, FIELD_TYPE } from '@/config/shortcuts'
import type { FieldCommand } from '@/hooks/useSlashCommands'
import { useCallback, useEffect, useState } from 'react'

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
}: FieldModalProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      // For inferred fields, use currentValue; for legacy, use initialValue
      const initialVal = isInferred ? String(currentValue ?? '') : initialValue || ''
      setValue(initialVal)
      setError('')
    }
  }, [open, initialValue, isInferred, currentValue])

  // Legacy submit handler (for slash commands)
  const handleSubmit = () => {
    if (!field || !onSubmit) return

    // Validation based on field type (derived from UserProfile metadata)
    const fieldType = FIELD_TYPE[field]
    if (fieldType === 'numeric') {
      const num = Number.parseInt(value, 10)
      const minValue = field === 'vehicles' ? 1 : 0 // Special case: vehicles must be >= 1
      if (Number.isNaN(num) || num < minValue) {
        setError(`Please enter a valid number (min: ${minValue})`)
        return
      }
      // Credit score validation (300-850 FICO range)
      if (field === 'creditScore') {
        if (num < 300 || num > 850) {
          setError('Credit score must be between 300 and 850 (FICO range)')
          return
        }
      }
    }

    // Name field requires non-empty value
    if (field === 'name' && !value.trim()) {
      setError('Please enter a name')
      return
    }

    onSubmit(value)
    onOpenChange(false)
  }

  // New handlers for inferred fields (Story 4.4)
  const handleDelete = useCallback(() => {
    onDelete?.()
    onOpenChange(false)
  }, [onDelete, onOpenChange])

  const handleSaveInferred = useCallback(() => {
    onSaveInferred?.(value)
    onOpenChange(false)
  }, [onSaveInferred, value, onOpenChange])

  const handleSaveKnown = useCallback(() => {
    // Story 4.5 will implement pill injection
    // For now, just call callback
    onSaveKnown?.(value)
    onOpenChange(false)
  }, [onSaveKnown, value, onOpenChange])

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

    const shortcutPrefix = `${metadata.shortcut}:`

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
            {/* Input with shortcut prefix */}
            <div className="flex items-center rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
              <span className="px-3 py-2 font-mono text-sm text-gray-500 dark:text-gray-400">
                {shortcutPrefix}
              </span>
              <Input
                type={getInputType()}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setError('')
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Input field */}
          <Input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            className="w-full"
            autoFocus
          />

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
